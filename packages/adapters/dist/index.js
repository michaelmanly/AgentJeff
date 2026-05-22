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
  LocalWorkspaceAdapter: () => LocalWorkspaceAdapter
});
module.exports = __toCommonJS(index_exports);

// src/badgr.ts
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

// src/workspace.ts
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BadgrAdapter,
  LocalWorkspaceAdapter
});
