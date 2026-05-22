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
import { randomUUID } from "crypto";
var newId = () => randomUUID();

// packages/runtime/src/runner.ts
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
import OpenAI from "openai";
var BadgrAdapter = class {
  client;
  model;
  constructor(opts = {}) {
    this.client = new OpenAI({
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
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
var execFileAsync = promisify(execFile);
var LocalWorkspaceAdapter = class {
  root;
  allowExec;
  constructor(opts) {
    this.root = path.resolve(opts.root);
    this.allowExec = opts.allowExec ?? false;
  }
  resolve(p) {
    const resolved = path.resolve(this.root, p);
    if (!resolved.startsWith(this.root)) {
      throw new Error(`Path escape detected: ${p}`);
    }
    return resolved;
  }
  async listFiles(dir) {
    const resolved = this.resolve(dir);
    const entries = await fs.readdir(resolved, { withFileTypes: true });
    const results = [];
    for (const e of entries) {
      results.push(e.isDirectory() ? `${e.name}/` : e.name);
    }
    return results;
  }
  async readFile(p) {
    return fs.readFile(this.resolve(p), "utf-8");
  }
  async writeFile(p, content) {
    const resolved = this.resolve(p);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf-8");
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
export {
  BadgrAdapter,
  LocalWorkspaceAdapter,
  defineAgent,
  definePack,
  defineTool,
  executeRun,
  initialState,
  newId,
  run
};
