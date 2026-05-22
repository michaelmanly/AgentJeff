"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BadgrAdapter: () => BadgrAdapter,
  LocalWorkspaceAdapter: () => LocalWorkspaceAdapter,
  defineAgent: () => defineAgent,
  definePack: () => definePack,
  defineTool: () => defineTool,
  executeRun: () => executeRun,
  initialState: () => initialState,
  newId: () => newId,
  run: () => run
});
module.exports = __toCommonJS(index_exports);

// packages/sdk/src/define.ts
function defineAgent(def) {
  return def;
}
function defineTool(def) {
  return def;
}

// packages/core/src/types/state.ts
function initialState() {
  return {
    currentStep: "start",
    intermediateValues: {},
    toolOutputs: {},
    errors: [],
    checkpointData: {}
  };
}

// packages/core/src/types/pack.ts
function definePack(pack) {
  return pack;
}

// packages/core/src/utils/id.ts
var import_crypto = require("crypto");
var newId = () => (0, import_crypto.randomUUID)();

// packages/runtime/src/runner.ts
var import_zod_to_json_schema = require("zod-to-json-schema");
var zodToJsonSchema = import_zod_to_json_schema.zodToJsonSchema;
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
  const run2 = {
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
        run2.result = response.content;
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
    run2.status = "completed";
    run2.completedAt = Date.now();
    emit(mkEvent("run.completed", { result: run2.result }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    run2.status = "failed";
    run2.error = msg;
    run2.completedAt = Date.now();
    emit(mkEvent("run.failed", { error: msg }));
  }
  return run2;
}

// packages/adapters/src/badgr.ts
var import_openai = __toESM(require("openai"));
var BadgrAdapter = class {
  client;
  model;
  constructor(opts = {}) {
    this.client = new import_openai.default({
      apiKey: opts.apiKey ?? process.env.BADGR_API_KEY ?? "",
      baseURL: opts.baseURL ?? process.env.BADGR_BASE_URL ?? "https://aibadgr.com/v1"
    });
    this.model = opts.model ?? "gpt-4o";
  }
  async complete(req) {
    const tools = req.tools && req.tools.length > 0 ? req.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    })) : void 0;
    const response = await this.client.chat.completions.create({
      model: req.model ?? this.model,
      messages: req.messages,
      tools,
      temperature: req.temperature,
      max_tokens: req.maxTokens
    });
    const choice = response.choices[0];
    const msg = choice.message;
    const toolCalls = (msg.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || "{}")
    }));
    return {
      content: msg.content,
      toolCalls,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens
      } : void 0
    };
  }
};

// packages/adapters/src/workspace.ts
var import_promises = __toESM(require("fs/promises"));
var import_path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_util = require("util");
var execFileAsync = (0, import_util.promisify)(import_child_process.execFile);
var LocalWorkspaceAdapter = class {
  root;
  allowExec;
  constructor(opts) {
    this.root = import_path.default.resolve(opts.root);
    this.allowExec = opts.allowExec ?? false;
  }
  resolve(p) {
    const resolved = import_path.default.resolve(this.root, p);
    if (!resolved.startsWith(this.root)) {
      throw new Error(`Path escape detected: ${p}`);
    }
    return resolved;
  }
  async listFiles(dir) {
    const resolved = this.resolve(dir);
    const entries = await import_promises.default.readdir(resolved, { withFileTypes: true });
    const results = [];
    for (const e of entries) {
      results.push(e.isDirectory() ? `${e.name}/` : e.name);
    }
    return results;
  }
  async readFile(p) {
    return import_promises.default.readFile(this.resolve(p), "utf-8");
  }
  async writeFile(p, content) {
    const resolved = this.resolve(p);
    await import_promises.default.mkdir(import_path.default.dirname(resolved), { recursive: true });
    await import_promises.default.writeFile(resolved, content, "utf-8");
  }
  async exec(command) {
    if (!this.allowExec) throw new Error("exec is disabled for this workspace adapter");
    try {
      const parts = command.split(" ");
      const { stdout, stderr } = await execFileAsync(parts[0], parts.slice(1), {
        cwd: this.root
      });
      return { stdout, stderr, exitCode: 0 };
    } catch (err) {
      return {
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? String(err),
        exitCode: err.code ?? 1
      };
    }
  }
};

// packages/sdk/src/run.ts
async function run(agent, input, opts = {}) {
  const adapter = opts.adapter ?? new BadgrAdapter();
  return executeRun({
    agent,
    input,
    inferenceAdapter: adapter,
    onEvent: opts.onEvent,
    checkpointSaver: opts.checkpointSaver
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BadgrAdapter,
  LocalWorkspaceAdapter,
  defineAgent,
  definePack,
  defineTool,
  executeRun,
  initialState,
  newId,
  run
});
