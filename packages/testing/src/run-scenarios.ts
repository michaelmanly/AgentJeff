import { runScenario, writeSummary, ScenarioResult } from './scenarios';
import { MockInferenceAdapter } from './harness';
import { executeRun } from '@agentjeff/runtime';
import { defineAgent, defineTool } from '@agentjeff/sdk';
import { LocalWorkspaceAdapter } from '@agentjeff/adapters';
import { buildWorkspaceAssistant, extractionAgent } from '@agentjeff/packs';
import type { AgentEvent } from '@agentjeff/core';
import { z } from 'zod';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

const ARTIFACTS = process.env.ARTIFACTS_DIR ?? './test-artifacts';

const echoTool = defineTool({
  name: 'echo',
  description: 'Echo input',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ echoed: z.string() }),
  async execute({ message }) { return { echoed: message }; },
});

const baseAgent = defineAgent({
  name: 'scenario-agent',
  instructions: 'You are a test agent.',
  inputSchema: z.object({ task: z.string() }),
  outputSchema: z.string(),
  tools: [echoTool],
});

async function main() {
  const results: ScenarioResult[] = [];

  // S1: workspace agent — starts, emits events, completes
  const wsPackAgent = buildWorkspaceAssistant(os.tmpdir());
  results.push(await runScenario(1, 'workspace agent run', {
    agent: wsPackAgent,
    input: { task: 'list files', path: '.' },
    adapter: new MockInferenceAdapter([
      { content: null, toolCalls: [{ id: 't1', name: 'list_files', arguments: { dir: '.' } }] },
      { content: 'done', toolCalls: [] },
    ]),
    artifactsDir: ARTIFACTS,
    assert(run) {
      if (run.status !== 'completed') throw new Error(`Expected completed, got ${run.status}`);
      const types = run.events.map(e => e.type);
      if (!types.includes('run.started')) throw new Error('Missing run.started');
      if (!types.includes('run.completed')) throw new Error('Missing run.completed');
      if (!types.includes('tool.called')) throw new Error('Missing tool.called');
    },
  }));

  // S2: structured extraction produces normalized JSON
  results.push(await runScenario(2, 'structured extraction output shape', {
    agent: extractionAgent,
    input: { text: 'Login button broken on Safari' },
    adapter: new MockInferenceAdapter([{
      content: null,
      toolCalls: [{
        id: 'tc1', name: 'extract_fields',
        arguments: { category: 'bug_report', priority: 'high', fields: { platform: 'Safari' }, summary: 'Login broken' },
      }],
    }, { content: 'done', toolCalls: [] }]),
    artifactsDir: ARTIFACTS,
    assert(run) {
      if (run.status !== 'completed') throw new Error(`Expected completed, got ${run.status}`);
      const succ = run.events.find(e => e.type === 'tool.succeeded');
      if (!succ) throw new Error('Missing tool.succeeded');
      if ((succ.payload.output as any).category !== 'bug_report') throw new Error('Wrong category');
    },
  }));

  // S3: workspace read/write tool events
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'newatom-s3-'));
  const wsAdapter = new LocalWorkspaceAdapter({ root: tmpDir });
  await wsAdapter.writeFile('hello.txt', 'original');

  const readTool = defineTool({
    name: 'read_file',
    description: 'Read file',
    inputSchema: z.object({ path: z.string() }),
    outputSchema: z.string(),
    async execute({ path: p }) { return wsAdapter.readFile(p); },
  });
  const writeTool = defineTool({
    name: 'write_file',
    description: 'Write file',
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    outputSchema: z.object({ ok: z.boolean() }),
    async execute({ path: p, content }) { await wsAdapter.writeFile(p, content); return { ok: true }; },
  });
  const wsAgent = defineAgent({
    name: 'ws-agent',
    instructions: 'test',
    inputSchema: z.object({ task: z.string() }),
    outputSchema: z.string(),
    tools: [readTool, writeTool],
  });

  results.push(await runScenario(3, 'workspace read-write tool events', {
    agent: wsAgent,
    input: { task: 'update hello.txt' },
    adapter: new MockInferenceAdapter([
      { content: null, toolCalls: [{ id: 't1', name: 'read_file', arguments: { path: 'hello.txt' } }] },
      { content: null, toolCalls: [{ id: 't2', name: 'write_file', arguments: { path: 'hello.txt', content: 'updated' } }] },
      { content: 'done', toolCalls: [] },
    ]),
    artifactsDir: ARTIFACTS,
    assert(run) {
      const succeeded = run.events.filter(e => e.type === 'tool.succeeded').map(e => e.payload.tool);
      if (!succeeded.includes('read_file')) throw new Error('Missing read_file success');
      if (!succeeded.includes('write_file')) throw new Error('Missing write_file success');
    },
  }));

  // S4: checkpoint save + checkpoint.created event
  const s4: ScenarioResult = { scenario: 4, name: 'checkpoint save on each step', status: 'pass', durationMs: 0 };
  const s4Start = Date.now();
  try {
    const checkpoints: unknown[] = [];
    const run = await executeRun({
      agent: baseAgent,
      input: { task: 'test' },
      inferenceAdapter: new MockInferenceAdapter([
        { content: null, toolCalls: [{ id: 't1', name: 'echo', arguments: { message: 'a' } }] },
        { content: 'done', toolCalls: [] },
      ]),
      checkpointSaver: async (runId, state) => { checkpoints.push({ runId, state }); },
    });
    if (checkpoints.length === 0) throw new Error('checkpointSaver never called');
    if (!run.events.some(e => e.type === 'checkpoint.created')) throw new Error('checkpoint.created not emitted');
    s4.runStatus = run.status;
    s4.eventCount = run.events.length;
    s4.events = run.events;
    s4.state = run.state;
  } catch (err) {
    s4.status = 'fail';
    s4.error = err instanceof Error ? err.message : String(err);
  }
  s4.durationMs = Date.now() - s4Start;
  await fs.mkdir(ARTIFACTS, { recursive: true });
  await fs.writeFile(path.join(ARTIFACTS, 'scenario-04-checkpoint.json'), JSON.stringify(s4, null, 2));
  results.push(s4);

  // S5: adapter failure — fails safely, emits run.failed
  results.push(await runScenario(5, 'adapter failure — safe fail', {
    agent: baseAgent,
    input: { task: 'test' },
    adapter: { async complete() { throw new Error('adapter down'); } } as any,
    artifactsDir: ARTIFACTS,
    assert(run) {
      if (run.status !== 'failed') throw new Error(`Expected failed, got ${run.status}`);
      if (!run.events.some(e => e.type === 'run.failed')) throw new Error('Missing run.failed');
      if (!run.error) throw new Error('run.error not set');
    },
  }));

  // S6: CLI end-to-end — events delivered to onEvent, output present
  const s6: ScenarioResult = { scenario: 6, name: 'CLI end-to-end — events visible, output present', status: 'pass', durationMs: 0 };
  const s6Start = Date.now();
  try {
    const capturedEvents: AgentEvent[] = [];
    const run = await executeRun({
      agent: extractionAgent,
      input: { text: 'Invoice #1234 overdue 30 days' },
      inferenceAdapter: new MockInferenceAdapter([{
        content: null,
        toolCalls: [{
          id: 'tc1', name: 'extract_fields',
          arguments: { category: 'invoice', priority: 'high', fields: { id: '1234' }, summary: 'Overdue invoice' },
        }],
      }, { content: 'done', toolCalls: [] }]),
      onEvent: (e) => capturedEvents.push(e),
    });
    if (run.status !== 'completed') throw new Error(`Expected completed, got ${run.status}`);
    if (capturedEvents.length === 0) throw new Error('No events delivered to onEvent');
    s6.runStatus = run.status;
    s6.eventCount = capturedEvents.length;
    s6.events = capturedEvents;
    s6.result = run.result;
  } catch (err) {
    s6.status = 'fail';
    s6.error = err instanceof Error ? err.message : String(err);
  }
  s6.durationMs = Date.now() - s6Start;
  await fs.writeFile(path.join(ARTIFACTS, 'scenario-06-cli-e2e.json'), JSON.stringify(s6, null, 2));
  results.push(s6);

  await writeSummary(ARTIFACTS, results);

  console.log('');
  let allPass = true;
  for (const r of results) {
    const icon = r.status === 'pass' ? '✓' : '✗';
    const extra = r.status === 'fail'
      ? `  ← FAILED: ${r.error}`
      : `  (${r.eventCount ?? 0} events, ${r.durationMs}ms)`;
    console.log(`  ${icon} Scenario ${r.scenario}: ${r.name}${extra}`);
    if (r.status === 'fail') allPass = false;
  }

  console.log('');
  console.log(`Artifacts: ${ARTIFACTS}/`);
  console.log('');

  if (!allPass) {
    console.log('RESULT: FAIL — see test-artifacts/summary.md');
    process.exit(1);
  } else {
    console.log('RESULT: PASS — all 6 scenarios passed');
  }
}

main().catch(err => {
  console.error('Scenario runner crashed:', err);
  process.exit(1);
});
