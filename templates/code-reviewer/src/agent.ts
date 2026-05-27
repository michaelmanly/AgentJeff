import { z } from 'zod';
import { defineAgent, defineTool, LocalWorkspaceAdapter } from '@agentjeff/sdk';

export function buildCodeReviewAgent(workspaceRoot: string) {
  const ws = new LocalWorkspaceAdapter({ root: workspaceRoot });

  const listFilesTool = defineTool({
    name: 'list_files',
    description: 'List files in a directory',
    inputSchema: z.object({ dir: z.string().default('.') }),
    outputSchema: z.array(z.string()),
    async execute({ dir }) {
      return ws.listFiles(dir);
    },
  });

  const readFileTool = defineTool({
    name: 'read_file',
    description: 'Read a source file for review',
    inputSchema: z.object({ path: z.string() }),
    outputSchema: z.string(),
    async execute({ path }) {
      return ws.readFile(path);
    },
  });

  const addIssueTool = defineTool({
    name: 'add_issue',
    description: 'Record a code review issue found in a file',
    inputSchema: z.object({
      file: z.string().describe('File path'),
      line: z.number().optional().describe('Line number'),
      severity: z.enum(['info', 'warning', 'error']),
      message: z.string().describe('What is wrong and why it matters'),
      suggestion: z.string().optional().describe('Concrete fix suggestion'),
    }),
    outputSchema: z.object({ ok: z.boolean() }),
    async execute(_input) {
      return { ok: true };
    },
  });

  return defineAgent({
    name: 'code-reviewer',
    instructions: `You are a senior engineer performing a thorough code review.

Steps:
1. List files to understand the project structure
2. Read each relevant source file (TypeScript/JavaScript first)
3. For every issue you find, call add_issue — be specific and actionable
4. Write a final summary with an overall recommendation

Priority order: correctness → security → performance → style
Be direct. If the code is good, say so.`,
    inputSchema: z.object({
      task: z.string().default('Review this codebase for issues'),
      focusPath: z.string().optional().describe('File or directory to focus on'),
    }),
    outputSchema: z.object({
      summary: z.string(),
      issueCount: z.number(),
      recommendation: z.enum(['approve', 'approve_with_comments', 'request_changes']),
    }),
    tools: [listFilesTool, readFileTool, addIssueTool],
    runtimeOptions: { maxSteps: 20 },
  });
}
