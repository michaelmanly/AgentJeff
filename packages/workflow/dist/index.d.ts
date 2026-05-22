import { AgentEvent } from '@agentjeff/core';

type StepFn<TState> = (state: TState, ctx: StepContext) => Promise<Partial<TState>>;
interface StepContext {
    runId: string;
    emit: (event: AgentEvent) => void;
}
interface WorkflowStep<TState> {
    name: string;
    fn: StepFn<TState>;
}
declare class Workflow<TState extends Record<string, unknown>> {
    private steps;
    private _name;
    constructor(name: string);
    step(name: string, fn: StepFn<TState>): this;
    run(initialState: TState, ctx: {
        runId: string;
        emit: (e: AgentEvent) => void;
    }): Promise<TState>;
}
declare function createWorkflow<TState extends Record<string, unknown>>(name: string): Workflow<TState>;

export { type StepContext, type StepFn, Workflow, type WorkflowStep, createWorkflow };
