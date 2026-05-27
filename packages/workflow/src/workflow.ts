import { AgentDef, InferenceAdapter, AgentEvent } from '@agentjeff/core';
import { executeRun, RunRequest } from '@agentjeff/runtime';

export type StepFn<TState> = (state: TState, ctx: StepContext) => Promise<Partial<TState>>;

export interface StepContext {
  runId: string;
  emit: (event: AgentEvent) => void;
}

export interface WorkflowStep<TState> {
  name: string;
  fn: StepFn<TState>;
}

export class Workflow<TState extends Record<string, unknown>> {
  private steps: WorkflowStep<TState>[] = [];
  private _name: string;

  constructor(name: string) {
    this._name = name;
  }

  step(name: string, fn: StepFn<TState>): this {
    this.steps.push({ name, fn });
    return this;
  }

  async run(
    initialState: TState,
    ctx?: { runId?: string; emit?: (e: AgentEvent) => void }
  ): Promise<TState> {
    const resolvedCtx: StepContext = {
      runId: ctx?.runId ?? `wf_${Date.now()}`,
      emit: ctx?.emit ?? (() => undefined),
    };
    let state = { ...initialState };
    for (const step of this.steps) {
      const patch = await step.fn(state, resolvedCtx);
      state = { ...state, ...patch };
    }
    return state;
  }
}

export function createWorkflow<TState extends Record<string, unknown>>(
  name: string
): Workflow<TState> {
  return new Workflow(name);
}
