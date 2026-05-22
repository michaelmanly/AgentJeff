import {
  AgentDef,
  AgentEvent,
  AgentState,
  InferenceAdapter,
  InferenceRequest,
  InferenceResponse,
  Run,
} from '@newatom/core';
import { executeRun } from '@newatom/runtime';

export interface FixtureResponse {
  content: string | null;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
}

export class MockInferenceAdapter implements InferenceAdapter {
  private responses: FixtureResponse[];
  private index = 0;

  constructor(responses: FixtureResponse[]) {
    this.responses = responses;
  }

  async complete(_req: InferenceRequest): Promise<InferenceResponse> {
    const r = this.responses[this.index++ % this.responses.length];
    return {
      content: r.content,
      toolCalls: r.toolCalls ?? [],
    };
  }
}

export interface RunAssertion {
  status?: Run['status'];
  eventTypes?: Array<AgentEvent['type']>;
  stateContains?: Partial<AgentState>;
  resultContains?: (result: unknown) => boolean;
}

export async function runAndAssert(
  agent: AgentDef,
  input: unknown,
  adapter: InferenceAdapter,
  assertions: RunAssertion
): Promise<Run> {
  const run = await executeRun({ agent, input, inferenceAdapter: adapter });

  if (assertions.status) {
    if (run.status !== assertions.status) {
      throw new Error(`Expected status ${assertions.status}, got ${run.status}`);
    }
  }

  if (assertions.eventTypes) {
    const seen = new Set(run.events.map((e) => e.type));
    for (const t of assertions.eventTypes) {
      if (!seen.has(t)) {
        throw new Error(`Expected event type '${t}' not found in run`);
      }
    }
  }

  if (assertions.stateContains) {
    for (const [k, v] of Object.entries(assertions.stateContains)) {
      const actual = (run.state as any)[k];
      if (JSON.stringify(actual) !== JSON.stringify(v)) {
        throw new Error(
          `State mismatch for key '${k}': expected ${JSON.stringify(v)}, got ${JSON.stringify(actual)}`
        );
      }
    }
  }

  if (assertions.resultContains && !assertions.resultContains(run.result)) {
    throw new Error(`Result assertion failed`);
  }

  return run;
}
