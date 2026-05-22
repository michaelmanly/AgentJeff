// src/workspace-pack/agent.ts
import { z as z2 } from "zod";
import { defineAgent } from "@newatom/sdk";
import { LocalWorkspaceAdapter } from "@newatom/adapters";

// src/workspace-pack/tools.ts
import { z } from "zod";
import { defineTool } from "@newatom/sdk";
function buildWorkspaceTools(adapter) {
  const listFiles = defineTool({
    name: "list_files",
    description: "List files in a directory",
    inputSchema: z.object({ dir: z.string().default(".") }),
    outputSchema: z.array(z.string()),
    async execute({ dir }) {
      return adapter.listFiles(dir);
    }
  });
  const readFile = defineTool({
    name: "read_file",
    description: "Read file contents",
    inputSchema: z.object({ path: z.string() }),
    outputSchema: z.string(),
    async execute({ path }) {
      return adapter.readFile(path);
    }
  });
  const writeFile = defineTool({
    name: "write_file",
    description: "Write content to a file",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    outputSchema: z.object({ ok: z.boolean() }),
    async execute({ path, content }) {
      await adapter.writeFile(path, content);
      return { ok: true };
    }
  });
  return { listFiles, readFile, writeFile };
}

// src/workspace-pack/agent.ts
function buildWorkspaceAssistant(workspaceRoot) {
  const adapter = new LocalWorkspaceAdapter({ root: workspaceRoot });
  const { listFiles, readFile, writeFile } = buildWorkspaceTools(adapter);
  return defineAgent({
    name: "workspace-assistant",
    instructions: `You are a workspace assistant. Use tools to inspect and modify the workspace.
Always start by listing files. Be concise and factual.`,
    inputSchema: z2.object({ task: z2.string(), path: z2.string().default(".") }),
    outputSchema: z2.object({ summary: z2.string() }),
    tools: [listFiles, readFile, writeFile],
    runtimeOptions: { maxSteps: 15 }
  });
}

// src/extraction-pack/agent.ts
import { z as z3 } from "zod";
import { defineAgent as defineAgent2, defineTool as defineTool2 } from "@newatom/sdk";
var ResultSchema = z3.object({
  category: z3.string(),
  priority: z3.enum(["low", "medium", "high"]),
  fields: z3.record(z3.string()),
  summary: z3.string()
});
var extractTool = defineTool2({
  name: "extract_fields",
  description: "Submit structured extraction result",
  inputSchema: ResultSchema,
  outputSchema: ResultSchema,
  async execute(input) {
    return input;
  }
});
var extractionAgent = defineAgent2({
  name: "extraction-agent",
  instructions: `You are a structured extraction agent. Classify, extract fields, and summarize any text.
Always call extract_fields with your result.`,
  inputSchema: z3.object({ text: z3.string() }),
  outputSchema: ResultSchema,
  tools: [extractTool],
  runtimeOptions: { maxSteps: 5 }
});
export {
  buildWorkspaceAssistant,
  buildWorkspaceTools,
  extractionAgent
};
