import { z } from 'zod';
import { defineAgent } from '@agentjeff/sdk';
import { LocalWorkspaceAdapter } from '@agentjeff/adapters';
import { buildWorkspaceTools } from './tools';

export function buildWorkspaceAssistant(workspaceRoot: string) {
  const adapter = new LocalWorkspaceAdapter({ root: workspaceRoot });
  const { listFiles, readFile, writeFile } = buildWorkspaceTools(adapter);

  return defineAgent({
    name: 'workspace-assistant',
    instructions: `You are a workspace assistant. Use tools to inspect and modify the workspace.
Always start by listing files. Be concise and factual.`,
    inputSchema: z.object({ task: z.string(), path: z.string().default('.') }),
    outputSchema: z.object({ summary: z.string() }),
    tools: [listFiles, readFile, writeFile],
    runtimeOptions: { maxSteps: 15 },
  });
}
