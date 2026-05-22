import { z } from 'zod';
import * as _newatom_core from '@newatom/core';
import { AgentDef, ToolDef, InferenceAdapter, AgentEvent, Run } from '@newatom/core';
export * from '@newatom/core';
export { RunRequest, executeRun } from '@newatom/runtime';
export { BadgrAdapter, LocalWorkspaceAdapter } from '@newatom/adapters';

declare function defineAgent<TInput extends z.ZodTypeAny, TOutput extends z.ZodTypeAny>(def: AgentDef<TInput, TOutput>): AgentDef<TInput, TOutput>;
declare function defineTool<TInput extends z.ZodTypeAny, TOutput extends z.ZodTypeAny>(def: ToolDef<TInput, TOutput>): ToolDef<TInput, TOutput>;

interface RunOptions {
    adapter?: InferenceAdapter;
    onEvent?: (event: AgentEvent) => void;
    checkpointSaver?: (runId: string, state: _newatom_core.AgentState) => Promise<void>;
}
declare function run(agent: AgentDef, input: unknown, opts?: RunOptions): Promise<Run>;

export { type RunOptions, defineAgent, defineTool, run };
