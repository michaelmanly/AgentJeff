import {
  AgentDef,
  AgentEvent,
  AgentState,
  InferenceAdapter,
  Message,
  RetryPolicy,
  Run,
  RunStatus,
  ToolContext,
  initialState,
  newId,
} from '@agentjeff/core';
import { zodToJsonSchema as _zodToJsonSchema } from 'zod-to-json-schema';

const zodToJsonSchema = _zodToJsonSchema as (schema: unknown) => Record<string, unknown>;

export interface RunRequest {
  agent: AgentDef;
  input: unknown;
  inferenceAdapter: InferenceAdapter;
  onEvent?: (event: AgentEvent) => void;
  checkpointSaver?: (runId: string, state: AgentState) => Promise<void>;
}

async function withRetry<T>(fn: () => Promise<T>, policy: RetryPolicy): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < policy.maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, policy.backoffMs));
      }
    }
  }
  throw lastErr;
}

export async function executeRun(req: RunRequest): Promise<Run> {
  const runId = newId();
  const events: AgentEvent[] = [];
  const state = initialState();

  function emit(event: AgentEvent) {
    events.push(event);
    req.onEvent?.(event);
  }

  function mkEvent(
    type: AgentEvent['type'],
    payload: Record<string, unknown>
  ): AgentEvent {
    return { id: newId(), type, runId, timestamp: Date.now(), payload };
  }

  const run: Run = {
    id: runId,
    agentName: req.agent.name,
    input: req.input,
    state,
    status: 'running',
    startedAt: Date.now(),
    events,
  };

  emit(mkEvent('run.started', { agentName: req.agent.name, input: req.input }));

  const { agent, inferenceAdapter } = req;
  const maxSteps = agent.runtimeOptions?.maxSteps ?? 20;
  const retryPolicy = agent.runtimeOptions?.retryPolicy;

  const toolMap = new Map(agent.tools.map((t) => [t.name, t]));

  const messages: Message[] = [
    { role: 'system', content: agent.instructions },
    { role: 'user', content: JSON.stringify(req.input) },
  ];

  const toolDefs = agent.tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: zodToJsonSchema(t.inputSchema),
  }));

  let stepCount = 0;

  try {
    while (stepCount < maxSteps) {
      stepCount++;
      state.currentStep = `step_${stepCount}`;

      const response = await inferenceAdapter.complete({
        messages,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
      });

      if (response.toolCalls.length === 0) {
        run.result = response.content;
        break;
      }

      // Record the assistant turn with its tool calls so adapters can send
      // the full conversation history in the correct format.
      messages.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
      });

      for (const tc of response.toolCalls) {
        const tool = toolMap.get(tc.name);
        if (!tool) {
          messages.push({ role: 'tool', toolCallId: tc.id, content: `Unknown tool: ${tc.name}` });
          continue;
        }

        const toolCtx: ToolContext = {
          runId,
          agentName: agent.name,
          emit,
        };

        emit(mkEvent('tool.called', { tool: tc.name, args: tc.arguments }));

        try {
          const parsed = tool.inputSchema.parse(tc.arguments);
          const execute = () => tool.execute(parsed, toolCtx);
          const output = retryPolicy ? await withRetry(execute, retryPolicy) : await execute();
          state.toolOutputs[tc.id] = output;
          emit(mkEvent('tool.succeeded', { tool: tc.name, output }));
          messages.push({ role: 'tool', toolCallId: tc.id, content: JSON.stringify(output) });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          state.errors.push({ step: state.currentStep, message: msg });
          emit(mkEvent('tool.failed', { tool: tc.name, error: msg }));
          messages.push({ role: 'tool', toolCallId: tc.id, content: `Error: ${msg}` });
        }
      }

      emit(mkEvent('state.updated', { state: { ...state } }));

      if (req.checkpointSaver) {
        await req.checkpointSaver(runId, state);
        emit(mkEvent('checkpoint.created', { step: state.currentStep }));
      }
    }

    run.status = 'completed';
    run.completedAt = Date.now();
    emit(mkEvent('run.completed', { result: run.result }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    run.status = 'failed';
    run.error = msg;
    run.completedAt = Date.now();
    emit(mkEvent('run.failed', { error: msg }));
  }

  return run;
}
