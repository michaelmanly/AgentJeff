import { InferenceAdapter, InferenceRequest, InferenceResponse, Run, AgentEvent, AgentState, AgentDef } from '@agentjeff/core';

interface FixtureResponse {
    content: string | null;
    toolCalls?: Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
    }>;
}
declare class MockInferenceAdapter implements InferenceAdapter {
    private responses;
    private index;
    constructor(responses: FixtureResponse[]);
    complete(_req: InferenceRequest): Promise<InferenceResponse>;
}
interface RunAssertion {
    status?: Run['status'];
    eventTypes?: Array<AgentEvent['type']>;
    stateContains?: Partial<AgentState>;
    resultContains?: (result: unknown) => boolean;
}
declare function runAndAssert(agent: AgentDef, input: unknown, adapter: InferenceAdapter, assertions: RunAssertion): Promise<Run>;

interface ScenarioResult {
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
interface ScenarioOptions {
    agent: AgentDef;
    input: unknown;
    adapter: InferenceAdapter;
    assert: (run: Run) => void;
    artifactsDir?: string;
}
declare function runScenario(scenarioNumber: number, name: string, opts: ScenarioOptions): Promise<ScenarioResult>;
declare function writeSummary(dir: string, results: ScenarioResult[]): Promise<void>;

export { type FixtureResponse, MockInferenceAdapter, type RunAssertion, type ScenarioOptions, type ScenarioResult, runAndAssert, runScenario, writeSummary };
