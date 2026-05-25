import { executeRun } from '../runner';
import { MockInferenceAdapter, runAndAssert } from '@agentjeff/testing';
import { defineAgent, defineTool } from '@agentjeff/sdk';
import { initialState } from '@agentjeff/core';
import { z } from 'zod';

// --- shared fixtures ---

const echoTool = defineTool({
  name: 'echo',
  description: 'Echo back input',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ echoed: z.string() }),
  async execute({ message }) { return { echoed: message }; },
});

const failingTool = defineTool({
  name: 'fail',
  description: 'Always throws',
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  async execute() { throw new Error('intentional failure'); },
});

const baseAgent = defineAgent({
  name: 'test-agent',
  instructions: 'You are a test agent.',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: z.string(),
  tools: [echoTool, failingTool],
});

// --- 1. agent definition ---

describe('agent definition', () => {
  test('preserves name and instructions', () => {
    expect(baseAgent.name).toBe('test-agent');
    expect(baseAgent.instructions).toContain('test agent');
  });

  test('tool list is accessible', () => {
    expect(baseAgent.tools.map(t => t.name)).toContain('echo');
    expect(baseAgent.tools.map(t => t.name)).toContain('fail');
  });

  test('inputSchema validates', () => {
    expect(() => baseAgent.inputSchema.parse({ prompt: 'hi' })).not.toThrow();
    expect(() => baseAgent.inputSchema.parse({})).toThrow();
  });
});

// --- 2. state transitions ---

describe('state', () => {
  test('initialState returns correct defaults', () => {
    const s = initialState();
    expect(s.currentStep).toBe('start');
    expect(s.errors).toEqual([]);
    expect(s.toolOutputs).toEqual({});
  });

  test('currentStep advances each loop iteration', async () => {
    const adapter = new MockInferenceAdapter([
      { content: null, toolCalls: [{ id: 'tc1', name: 'echo', arguments: { message: 'a' } }] },
      { content: 'done', toolCalls: [] },
    ]);
    const run = await executeRun({ agent: baseAgent, input: { prompt: 'hi' }, inferenceAdapter: adapter });
    const updates = run.events.filter(e => e.type === 'state.updated');
    expect(updates.length).toBeGreaterThan(0);
    const steps = updates.map(e => (e.payload.state as any).currentStep);
    expect(steps[0]).toBe('step_1');
  });
});

// --- 3. event emission ---

describe('event emission', () => {
  test('emits run.started, run.completed on clean run', async () => {
    const run = await runAndAssert(
      baseAgent,
      { prompt: 'hi' },
      new MockInferenceAdapter([{ content: 'ok', toolCalls: [] }]),
      { status: 'completed', eventTypes: ['run.started', 'run.completed'] }
    );
    expect(run.events[0].type).toBe('run.started');
    expect(run.events[run.events.length - 1].type).toBe('run.completed');
  });

  test('emits tool.called + tool.succeeded for successful tool', async () => {
    await runAndAssert(
      baseAgent,
      { prompt: 'hi' },
      new MockInferenceAdapter([
        { content: null, toolCalls: [{ id: 'tc1', name: 'echo', arguments: { message: 'ping' } }] },
        { content: 'done', toolCalls: [] },
      ]),
      { eventTypes: ['tool.called', 'tool.succeeded'] }
    );
  });

  test('emits tool.failed when tool throws, run still completes', async () => {
    const run = await executeRun({
      agent: baseAgent,
      input: { prompt: 'hi' },
      inferenceAdapter: new MockInferenceAdapter([
        { content: null, toolCalls: [{ id: 'tc2', name: 'fail', arguments: {} }] },
        { content: 'recovered', toolCalls: [] },
      ]),
    });
    expect(run.events.some(e => e.type === 'tool.failed')).toBe(true);
    expect(run.status).toBe('completed');
  });
});

// --- 4. adapter contract ---

describe('adapter contract', () => {
  test('adapter returning no tool calls ends run', async () => {
    const run = await executeRun({
      agent: baseAgent,
      input: { prompt: 'test' },
      inferenceAdapter: new MockInferenceAdapter([{ content: 'final answer' }]),
    });
    expect(run.result).toBe('final answer');
    expect(run.status).toBe('completed');
  });

  test('adapter error propagates as run.failed', async () => {
    const crashAdapter = {
      async complete() { throw new Error('adapter crashed'); },
    };
    const run = await executeRun({
      agent: baseAgent,
      input: { prompt: 'x' },
      inferenceAdapter: crashAdapter,
    });
    expect(run.status).toBe('failed');
    expect(run.error).toContain('adapter crashed');
    expect(run.events.some(e => e.type === 'run.failed')).toBe(true);
  });
});

// --- 5. checkpoint ---

describe('checkpoint', () => {
  test('checkpointSaver is called and checkpoint.created is emitted', async () => {
    const saved: Array<{ runId: string; state: unknown }> = [];
    const run = await executeRun({
      agent: baseAgent,
      input: { prompt: 'hi' },
      inferenceAdapter: new MockInferenceAdapter([
        { content: null, toolCalls: [{ id: 'tc1', name: 'echo', arguments: { message: 'x' } }] },
        { content: 'done', toolCalls: [] },
      ]),
      checkpointSaver: async (runId, state) => { saved.push({ runId, state }); },
    });
    expect(saved.length).toBeGreaterThan(0);
    expect(run.events.some(e => e.type === 'checkpoint.created')).toBe(true);
  });
});

// --- 6. tool execution wrapper ---

describe('tool execution wrapper', () => {
  test('retries failing tool up to maxAttempts', async () => {
    let attempts = 0;
    const flaky = defineTool({
      name: 'flaky',
      description: 'Fails first two times, succeeds on third',
      inputSchema: z.object({}),
      outputSchema: z.object({ ok: z.boolean() }),
      async execute() {
        attempts++;
        if (attempts < 3) throw new Error('transient');
        return { ok: true };
      },
    });
    const agent = defineAgent({
      name: 'retry-agent',
      instructions: 'test',
      inputSchema: z.object({ x: z.string() }),
      outputSchema: z.string(),
      tools: [flaky],
      runtimeOptions: { retryPolicy: { maxAttempts: 3, backoffMs: 0 } },
    });
    const run = await executeRun({
      agent,
      input: { x: 'hi' },
      inferenceAdapter: new MockInferenceAdapter([
        { content: null, toolCalls: [{ id: 'tc1', name: 'flaky', arguments: {} }] },
        { content: 'done', toolCalls: [] },
      ]),
    });
    expect(attempts).toBe(3);
    expect(run.events.some(e => e.type === 'tool.succeeded')).toBe(true);
    expect(run.events.some(e => e.type === 'tool.failed')).toBe(false);
  });

  test('emits tool.failed after exhausting all retry attempts', async () => {
    const alwaysFails = defineTool({
      name: 'always-fails',
      description: 'Always throws',
      inputSchema: z.object({}),
      outputSchema: z.object({}),
      async execute() { throw new Error('permanent'); },
    });
    const agent = defineAgent({
      name: 'exhaust-agent',
      instructions: 'test',
      inputSchema: z.object({ x: z.string() }),
      outputSchema: z.string(),
      tools: [alwaysFails],
      runtimeOptions: { retryPolicy: { maxAttempts: 2, backoffMs: 0 } },
    });
    const run = await executeRun({
      agent,
      input: { x: 'hi' },
      inferenceAdapter: new MockInferenceAdapter([
        { content: null, toolCalls: [{ id: 'tc1', name: 'always-fails', arguments: {} }] },
        { content: 'done', toolCalls: [] },
      ]),
    });
    expect(run.events.some(e => e.type === 'tool.failed')).toBe(true);
    expect(run.status).toBe('completed');
  });

  test('tool input is validated via zod schema', async () => {
    const strictTool = defineTool({
      name: 'strict',
      description: 'Requires exact types',
      inputSchema: z.object({ count: z.number() }),
      outputSchema: z.object({ doubled: z.number() }),
      async execute({ count }) { return { doubled: count * 2 }; },
    });
    const agent = defineAgent({
      name: 'strict-agent',
      instructions: 'test',
      inputSchema: z.object({ x: z.string() }),
      outputSchema: z.string(),
      tools: [strictTool],
    });
    // pass wrong type for 'count' — zod should reject and tool.failed should be emitted
    const run = await executeRun({
      agent,
      input: { x: 'hi' },
      inferenceAdapter: new MockInferenceAdapter([
        { content: null, toolCalls: [{ id: 'tc1', name: 'strict', arguments: { count: 'not-a-number' } }] },
        { content: 'done', toolCalls: [] },
      ]),
    });
    expect(run.events.some(e => e.type === 'tool.failed')).toBe(true);
  });
});
