import { z } from 'zod';
import { defineAgent, defineTool, LocalWorkspaceAdapter } from '@newatom/sdk';

export function buildWorkspaceAgent(workspaceRoot: string) {
  const ws = new LocalWorkspaceAdapter({ root: workspaceRoot });

  const listFilesTool = defineTool({
    name: 'list_files',
    description: 'List files in a directory within the workspace',
    inputSchema: z.object({ dir: z.string().default('.') }),
    outputSchema: z.array(z.string()),
    async execute({ dir }, _ctx) {
      return ws.listFiles(dir);
    },
  });

  const readFileTool = defineTool({
    name: 'read_file',
    description: 'Read the contents of a file',
    inputSchema: z.object({ path: z.string() }),
    outputSchema: z.string(),
    async execute({ path }, _ctx) {
      return ws.readFile(path);
    },
  });

  const writeFileTool = defineTool({
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    outputSchema: z.object({ ok: z.boolean() }),
    async execute({ path, content }, _ctx) {
      await ws.writeFile(path, content);
      return { ok: true };
    },
  });

  return defineAgent({
    name: 'workspace-assistant',
    instructions: `You are a workspace assistant. You help developers understand and work with code repositories.
Given a task, use the available tools to inspect the workspace, understand the code structure,
and complete the requested changes or provide a summary.
Always start by listing files to understand the workspace structure.`,
    inputSchema: z.object({
      task: z.string(),
      path: z.string().default('.'),
    }),
    outputSchema: z.object({ summary: z.string() }),
    tools: [listFilesTool, readFileTool, writeFileTool],
    runtimeOptions: { maxSteps: 15 },
  });
}
