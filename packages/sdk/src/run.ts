import { AgentDef, AgentEvent, InferenceAdapter, Run } from '@newatom/core';
import { executeRun } from '@newatom/runtime';
import { BadgrAdapter } from '@newatom/adapters';

export interface RunOptions {
  adapter?: InferenceAdapter;
  onEvent?: (event: AgentEvent) => void;
  checkpointSaver?: (runId: string, state: import('@newatom/core').AgentState) => Promise<void>;
}

export async function run(
  agent: AgentDef,
  input: unknown,
  opts: RunOptions = {}
): Promise<Run> {
  const adapter = opts.adapter ?? new BadgrAdapter();
  return executeRun({
    agent,
    input,
    inferenceAdapter: adapter,
    onEvent: opts.onEvent,
    checkpointSaver: opts.checkpointSaver,
  });
}
