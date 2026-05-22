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
  buildWorkspaceAssistant: () => buildWorkspaceAssistant,
  buildWorkspaceTools: () => buildWorkspaceTools,
  extractionAgent: () => extractionAgent
});
module.exports = __toCommonJS(index_exports);

// src/workspace-pack/agent.ts
var import_zod2 = require("zod");
var import_sdk2 = require("@agentjeff/sdk");
var import_adapters = require("@agentjeff/adapters");

// src/workspace-pack/tools.ts
var import_zod = require("zod");
var import_sdk = require("@agentjeff/sdk");
function buildWorkspaceTools(adapter) {
  const listFiles = (0, import_sdk.defineTool)({
    name: "list_files",
    description: "List files in a directory",
    inputSchema: import_zod.z.object({ dir: import_zod.z.string().default(".") }),
    outputSchema: import_zod.z.array(import_zod.z.string()),
    async execute({ dir }) {
      return adapter.listFiles(dir);
    }
  });
  const readFile = (0, import_sdk.defineTool)({
    name: "read_file",
    description: "Read file contents",
    inputSchema: import_zod.z.object({ path: import_zod.z.string() }),
    outputSchema: import_zod.z.string(),
    async execute({ path }) {
      return adapter.readFile(path);
    }
  });
  const writeFile = (0, import_sdk.defineTool)({
    name: "write_file",
    description: "Write content to a file",
    inputSchema: import_zod.z.object({ path: import_zod.z.string(), content: import_zod.z.string() }),
    outputSchema: import_zod.z.object({ ok: import_zod.z.boolean() }),
    async execute({ path, content }) {
      await adapter.writeFile(path, content);
      return { ok: true };
    }
  });
  return { listFiles, readFile, writeFile };
}

// src/workspace-pack/agent.ts
function buildWorkspaceAssistant(workspaceRoot) {
  const adapter = new import_adapters.LocalWorkspaceAdapter({ root: workspaceRoot });
  const { listFiles, readFile, writeFile } = buildWorkspaceTools(adapter);
  return (0, import_sdk2.defineAgent)({
    name: "workspace-assistant",
    instructions: `You are a workspace assistant. Use tools to inspect and modify the workspace.
Always start by listing files. Be concise and factual.`,
    inputSchema: import_zod2.z.object({ task: import_zod2.z.string(), path: import_zod2.z.string().default(".") }),
    outputSchema: import_zod2.z.object({ summary: import_zod2.z.string() }),
    tools: [listFiles, readFile, writeFile],
    runtimeOptions: { maxSteps: 15 }
  });
}

// src/extraction-pack/agent.ts
var import_zod3 = require("zod");
var import_sdk3 = require("@agentjeff/sdk");
var ResultSchema = import_zod3.z.object({
  category: import_zod3.z.string(),
  priority: import_zod3.z.enum(["low", "medium", "high"]),
  fields: import_zod3.z.record(import_zod3.z.string()),
  summary: import_zod3.z.string()
});
var extractTool = (0, import_sdk3.defineTool)({
  name: "extract_fields",
  description: "Submit structured extraction result",
  inputSchema: ResultSchema,
  outputSchema: ResultSchema,
  async execute(input) {
    return input;
  }
});
var extractionAgent = (0, import_sdk3.defineAgent)({
  name: "extraction-agent",
  instructions: `You are a structured extraction agent. Classify, extract fields, and summarize any text.
Always call extract_fields with your result.`,
  inputSchema: import_zod3.z.object({ text: import_zod3.z.string() }),
  outputSchema: ResultSchema,
  tools: [extractTool],
  runtimeOptions: { maxSteps: 5 }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildWorkspaceAssistant,
  buildWorkspaceTools,
  extractionAgent
});
