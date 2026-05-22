import fs from 'fs/promises';
import path from 'path';
import { AgentDef, AgentEvent, InferenceAdapter, Run } from '@newatom/core';
import { executeRun } from '@newatom/runtime';

export interface ScenarioResult {
  scenario: number;
  name: string;
  status: 'pass' | 'fail';
  runStatus?: Run['status'];
  eventCount?: number;
  durationMs?: number;
  error?: string;
  events?: AgentEvent[];
  state?: unknown;
  result?: unknown;
}

export interface ScenarioOptions {
  agent: AgentDef;
  input: unknown;
  adapter: InferenceAdapter;
  assert: (run: Run) => void;
  artifactsDir?: string;
}

export async function runScenario(
  scenarioNumber: number,
  name: string,
  opts: ScenarioOptions
): Promise<ScenarioResult> {
  const start = Date.now();
  let run: Run | undefined;
  try {
    run = await executeRun({
      agent: opts.agent,
      input: opts.input,
      inferenceAdapter: opts.adapter,
    });
    opts.assert(run);

    const result: ScenarioResult = {
      scenario: scenarioNumber,
      name,
      status: 'pass',
      runStatus: run.status,
      eventCount: run.events.length,
      durationMs: Date.now() - start,
      events: run.events,
      state: run.state,
      result: run.result,
    };

    if (opts.artifactsDir) await writeArtifacts(opts.artifactsDir, scenarioNumber, name, result, run);
    return result;
  } catch (err) {
    const result: ScenarioResult = {
      scenario: scenarioNumber,
      name,
      status: 'fail',
      runStatus: run?.status,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      events: run?.events,
      state: run?.state,
    };
    if (opts.artifactsDir) await writeArtifacts(opts.artifactsDir, scenarioNumber, name, result, run);
    return result;
  }
}

async function writeArtifacts(
  dir: string,
  num: number,
  name: string,
  result: ScenarioResult,
  run?: Run
) {
  await fs.mkdir(dir, { recursive: true });
  const slug = `scenario-${String(num).padStart(2, '0')}-${name.replace(/\s+/g, '-').toLowerCase()}`;
  await fs.writeFile(path.join(dir, `${slug}.json`), JSON.stringify({ result, run }, null, 2));
}

export async function writeSummary(dir: string, results: ScenarioResult[]): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  const lines = [
    `# Phase 1 Scenario Results`,
    ``,
    `Date: ${new Date().toISOString()}`,
    `Passed: ${passed}/${results.length}  Failed: ${failed}/${results.length}`,
    ``,
    `## Scenarios`,
    ``,
    ...results.map(r =>
      `- [${r.status === 'pass' ? 'PASS' : 'FAIL'}] Scenario ${r.scenario}: ${r.name}` +
      (r.error ? `\n  Error: ${r.error}` : '') +
      (r.durationMs ? ` (${r.durationMs}ms)` : '')
    ),
  ];

  await fs.writeFile(path.join(dir, 'summary.md'), lines.join('\n'));
  await fs.writeFile(path.join(dir, 'results.json'), JSON.stringify(results, null, 2));
}
