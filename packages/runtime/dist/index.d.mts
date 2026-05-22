import { AgentDef, InferenceAdapter, AgentEvent, AgentState, Run } from '@agentjeff/core';

interface RunRequest {
    agent: AgentDef;
    input: unknown;
    inferenceAdapter: InferenceAdapter;
    onEvent?: (event: AgentEvent) => void;
    checkpointSaver?: (runId: string, state: AgentState) => Promise<void>;
}
declare function executeRun(req: RunRequest): Promise<Run>;

export { type RunRequest, executeRun };
