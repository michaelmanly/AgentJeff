"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  executeRun: () => executeRun
});
module.exports = __toCommonJS(index_exports);

// src/runner.ts
var import_core = require("@newatom/core");
var import_zod_to_json_schema = require("zod-to-json-schema");
async function executeRun(req) {
  const runId = (0, import_core.newId)();
  const events = [];
  const state = (0, import_core.initialState)();
  function emit(event) {
    events.push(event);
    req.onEvent?.(event);
  }
  function mkEvent(type, payload) {
    return { id: (0, import_core.newId)(), type, runId, timestamp: Date.now(), payload };
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
    parameters: (0, import_zod_to_json_schema.zodToJsonSchema)(t.inputSchema)
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeRun
});
