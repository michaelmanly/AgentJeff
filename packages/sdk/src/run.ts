import { AgentDef, AgentEvent, InferenceAdapter, Run } from '@agentjeff/core';
import { executeRun } from '@agentjeff/runtime';
import { BadgrAdapter } from '@agentjeff/adapters';

export interface RunOptions {
  adapter?: InferenceAdapter;
  onEvent?: (event: AgentEvent) => void;
  checkpointSaver?: (runId: string, state: import('@agentjeff/core').AgentState) => Promise<void>;
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
