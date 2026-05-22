// src/badgr.ts
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

// src/workspace.ts
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
export {
  BadgrAdapter,
  LocalWorkspaceAdapter
};
