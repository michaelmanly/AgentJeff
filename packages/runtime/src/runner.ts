import {
  AgentDef,
  AgentEvent,
  AgentState,
  InferenceAdapter,
  Run,
  RunStatus,
  ToolContext,
  initialState,
  newId,
} from '@agentjeff/core';
import { z } from 'zod';
import { zodToJsonSchema as _zodToJsonSchema } from 'zod-to-json-schema';

const zodToJsonSchema = _zodToJsonSchema as (schema: unknown) => Record<string, unknown>;

export interface RunRequest {
  agent: AgentDef;
  input: unknown;
  inferenceAdapter: InferenceAdapter;
  onEvent?: (event: AgentEvent) => void;
  checkpointSaver?: (runId: string, state: AgentState) => Promise<void>;
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

  const toolMap = new Map(agent.tools.map((t) => [t.name, t]));

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
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
        // Final answer
        run.result = response.content;
        break;
      }

      for (const tc of response.toolCalls) {
        const tool = toolMap.get(tc.name);
        if (!tool) continue;

        const toolCtx: ToolContext = {
          runId,
          agentName: agent.name,
          emit,
        };

        emit(mkEvent('tool.called', { tool: tc.name, args: tc.arguments }));

        try {
          const parsed = tool.inputSchema.parse(tc.arguments);
          const output = await tool.execute(parsed, toolCtx);
          state.toolOutputs[tc.id] = output;
          emit(mkEvent('tool.succeeded', { tool: tc.name, output }));
          messages.push({
            role: 'assistant',
            content: `Tool ${tc.name} returned: ${JSON.stringify(output)}`,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          state.errors.push({ step: state.currentStep, message: msg });
          emit(mkEvent('tool.failed', { tool: tc.name, error: msg }));
          messages.push({ role: 'assistant', content: `Tool ${tc.name} failed: ${msg}` });
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
