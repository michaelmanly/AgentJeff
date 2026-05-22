// src/workspace-assistant/agent.ts
import { z } from "zod";
import { defineAgent, defineTool, LocalWorkspaceAdapter } from "@agentjeff/sdk";
function buildWorkspaceAgent(workspaceRoot) {
  const ws = new LocalWorkspaceAdapter({ root: workspaceRoot });
  const listFilesTool = defineTool({
    name: "list_files",
    description: "List files in a directory within the workspace",
    inputSchema: z.object({ dir: z.string().default(".") }),
    outputSchema: z.array(z.string()),
    async execute({ dir }, _ctx) {
      return ws.listFiles(dir);
    }
  });
  const readFileTool = defineTool({
    name: "read_file",
    description: "Read the contents of a file",
    inputSchema: z.object({ path: z.string() }),
    outputSchema: z.string(),
    async execute({ path }, _ctx) {
      return ws.readFile(path);
    }
  });
  const writeFileTool = defineTool({
    name: "write_file",
    description: "Write content to a file",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    outputSchema: z.object({ ok: z.boolean() }),
    async execute({ path, content }, _ctx) {
      await ws.writeFile(path, content);
      return { ok: true };
    }
  });
  return defineAgent({
    name: "workspace-assistant",
    instructions: `You are a workspace assistant. You help developers understand and work with code repositories.
Given a task, use the available tools to inspect the workspace, understand the code structure,
and complete the requested changes or provide a summary.
Always start by listing files to understand the workspace structure.`,
    inputSchema: z.object({
      task: z.string(),
      path: z.string().default(".")
    }),
    outputSchema: z.object({ summary: z.string() }),
    tools: [listFilesTool, readFileTool, writeFileTool],
    runtimeOptions: { maxSteps: 15 }
  });
}

// src/structured-extraction/agent.ts
import { z as z2 } from "zod";
import { defineAgent as defineAgent2, defineTool as defineTool2 } from "@agentjeff/sdk";
var ExtractedSchema = z2.object({
  category: z2.string(),
  priority: z2.enum(["low", "medium", "high"]),
  fields: z2.record(z2.string()),
  summary: z2.string()
});
var extractFieldsTool = defineTool2({
  name: "extract_fields",
  description: "Extract structured fields from the analyzed text",
  inputSchema: z2.object({
    category: z2.string(),
    priority: z2.enum(["low", "medium", "high"]),
    fields: z2.record(z2.string()),
    summary: z2.string()
  }),
  outputSchema: ExtractedSchema,
  async execute(input, _ctx) {
    return input;
  }
});
var extractionAgent = defineAgent2({
  name: "structured-extraction",
  instructions: `You are a structured extraction agent. Given raw text, you:
1. Classify it into a category (e.g. bug_report, feature_request, question, feedback)
2. Assign a priority: low, medium, or high
3. Extract key fields as key-value pairs
4. Write a one-sentence summary

Always call extract_fields with your result.`,
  inputSchema: z2.object({ text: z2.string() }),
  outputSchema: ExtractedSchema,
  tools: [extractFieldsTool],
  runtimeOptions: { maxSteps: 5 }
});
export {
  buildWorkspaceAgent,
  extractionAgent
};
