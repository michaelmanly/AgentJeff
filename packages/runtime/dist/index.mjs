// src/runner.ts
import {
  initialState,
  newId
} from "@agentjeff/core";
import { zodToJsonSchema as _zodToJsonSchema } from "zod-to-json-schema";
var zodToJsonSchema = _zodToJsonSchema;
async function executeRun(req) {
  const runId = newId();
  const events = [];
  const state = initialState();
  function emit(event) {
    events.push(event);
    req.onEvent?.(event);
  }
  function mkEvent(type, payload) {
    return { id: newId(), type, runId, timestamp: Date.now(), payload };
  }
  const run = {
    id: runId,
    agentName: req.agent.name,
    input: req.input,
    state,
    status: "running",
    startedAt: Date.now(),
    events
  };
  emit(mkEvent("run.started", { agentName: req.agent.name, input: req.input }));
  const { agent, inferenceAdapter } = req;
  const maxSteps = agent.runtimeOptions?.maxSteps ?? 20;
  const toolMap = new Map(agent.tools.map((t) => [t.name, t]));
  const messages = [
    { role: "system", content: agent.instructions },
    { role: "user", content: JSON.stringify(req.input) }
  ];
  const toolDefs = agent.tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: zodToJsonSchema(t.inputSchema)
  }));
  let stepCount = 0;
  try {
    while (stepCount < maxSteps) {
      stepCount++;
      state.currentStep = `step_${stepCount}`;
      const response = await inferenceAdapter.complete({
        messages,
        tools: toolDefs.length > 0 ? toolDefs : void 0
      });
      if (response.toolCalls.length === 0) {
        run.result = response.content;
        break;
      }
      for (const tc of response.toolCalls) {
        const tool = toolMap.get(tc.name);
        if (!tool) continue;
        const toolCtx = {
          runId,
          agentName: agent.name,
          emit
        };
        emit(mkEvent("tool.called", { tool: tc.name, args: tc.arguments }));
        try {
          const parsed = tool.inputSchema.parse(tc.arguments);
          const output = await tool.execute(parsed, toolCtx);
          state.toolOutputs[tc.id] = output;
          emit(mkEvent("tool.succeeded", { tool: tc.name, output }));
          messages.push({
            role: "assistant",
            content: `Tool ${tc.name} returned: ${JSON.stringify(output)}`
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          state.errors.push({ step: state.currentStep, message: msg });
          emit(mkEvent("tool.failed", { tool: tc.name, error: msg }));
          messages.push({ role: "assistant", content: `Tool ${tc.name} failed: ${msg}` });
        }
      }
      emit(mkEvent("state.updated", { state: { ...state } }));
      if (req.checkpointSaver) {
        await req.checkpointSaver(runId, state);
        emit(mkEvent("checkpoint.created", { step: state.currentStep }));
      }
    }
    run.status = "completed";
    run.completedAt = Date.now();
    emit(mkEvent("run.completed", { result: run.result }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    run.status = "failed";
    run.error = msg;
    run.completedAt = Date.now();
    emit(mkEvent("run.failed", { error: msg }));
  }
  return run;
}
export {
  executeRun
};
