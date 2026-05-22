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
  buildWorkspaceAgent: () => buildWorkspaceAgent,
  extractionAgent: () => extractionAgent
});
module.exports = __toCommonJS(index_exports);

// src/workspace-assistant/agent.ts
var import_zod = require("zod");
var import_sdk = require("@newatom/sdk");
function buildWorkspaceAgent(workspaceRoot) {
  const ws = new import_sdk.LocalWorkspaceAdapter({ root: workspaceRoot });
  const listFilesTool = (0, import_sdk.defineTool)({
    name: "list_files",
    description: "List files in a directory within the workspace",
    inputSchema: import_zod.z.object({ dir: import_zod.z.string().default(".") }),
    outputSchema: import_zod.z.array(import_zod.z.string()),
    async execute({ dir }, _ctx) {
      return ws.listFiles(dir);
    }
  });
  const readFileTool = (0, import_sdk.defineTool)({
    name: "read_file",
    description: "Read the contents of a file",
    inputSchema: import_zod.z.object({ path: import_zod.z.string() }),
    outputSchema: import_zod.z.string(),
    async execute({ path }, _ctx) {
      return ws.readFile(path);
    }
  });
  const writeFileTool = (0, import_sdk.defineTool)({
    name: "write_file",
    description: "Write content to a file",
    inputSchema: import_zod.z.object({ path: import_zod.z.string(), content: import_zod.z.string() }),
    outputSchema: import_zod.z.object({ ok: import_zod.z.boolean() }),
    async execute({ path, content }, _ctx) {
      await ws.writeFile(path, content);
      return { ok: true };
    }
  });
  return (0, import_sdk.defineAgent)({
    name: "workspace-assistant",
    instructions: `You are a workspace assistant. You help developers understand and work with code repositories.
Given a task, use the available tools to inspect the workspace, understand the code structure,
and complete the requested changes or provide a summary.
Always start by listing files to understand the workspace structure.`,
    inputSchema: import_zod.z.object({
      task: import_zod.z.string(),
      path: import_zod.z.string().default(".")
    }),
    outputSchema: import_zod.z.object({ summary: import_zod.z.string() }),
    tools: [listFilesTool, readFileTool, writeFileTool],
    runtimeOptions: { maxSteps: 15 }
  });
}

// src/structured-extraction/agent.ts
var import_zod2 = require("zod");
var import_sdk2 = require("@newatom/sdk");
var ExtractedSchema = import_zod2.z.object({
  category: import_zod2.z.string(),
  priority: import_zod2.z.enum(["low", "medium", "high"]),
  fields: import_zod2.z.record(import_zod2.z.string()),
  summary: import_zod2.z.string()
});
var extractFieldsTool = (0, import_sdk2.defineTool)({
  name: "extract_fields",
  description: "Extract structured fields from the analyzed text",
  inputSchema: import_zod2.z.object({
    category: import_zod2.z.string(),
    priority: import_zod2.z.enum(["low", "medium", "high"]),
    fields: import_zod2.z.record(import_zod2.z.string()),
    summary: import_zod2.z.string()
  }),
  outputSchema: ExtractedSchema,
  async execute(input, _ctx) {
    return input;
  }
});
var extractionAgent = (0, import_sdk2.defineAgent)({
  name: "structured-extraction",
  instructions: `You are a structured extraction agent. Given raw text, you:
1. Classify it into a category (e.g. bug_report, feature_request, question, feedback)
2. Assign a priority: low, medium, or high
3. Extract key fields as key-value pairs
4. Write a one-sentence summary

Always call extract_fields with your result.`,
  inputSchema: import_zod2.z.object({ text: import_zod2.z.string() }),
  outputSchema: ExtractedSchema,
  tools: [extractFieldsTool],
  runtimeOptions: { maxSteps: 5 }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildWorkspaceAgent,
  extractionAgent
});
