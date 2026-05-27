import { z } from 'zod';
import { defineAgent, defineTool, LocalWorkspaceAdapter } from '@agentjeff/sdk';

const IssueSeverity = z.enum(['info', 'warning', 'error']);

const reviewIssueTool = defineTool({
  name: 'add_issue',
  description: 'Record a code review issue found in a file',
  inputSchema: z.object({
    file: z.string().describe('File path relative to workspace root'),
    line: z.number().optional().describe('Line number (omit if file-level issue)'),
    severity: IssueSeverity,
    message: z.string().describe('What is wrong and why it matters'),
    suggestion: z.string().optional().describe('Concrete fix suggestion'),
  }),
  outputSchema: z.object({ ok: z.boolean() }),
  async execute(_input) {
    return { ok: true };
  },
});

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

  return defineAgent({
    name: 'code-reviewer',
    instructions: `You are a senior engineer performing a code review. Given a workspace, you:
1. List files to understand the project structure
2. Read relevant source files (focus on TypeScript/JavaScript)
3. Identify issues: bugs, security problems, poor naming, missing error handling
4. Record each issue with add_issue specifying severity and a concrete suggestion
5. Write a final summary with an overall quality assessment

Focus on correctness and security first, then style. Be specific and actionable.`,
    inputSchema: z.object({
      task: z.string().default('Review the codebase for issues'),
      focusPath: z.string().optional().describe('Specific file or directory to focus on'),
    }),
    outputSchema: z.object({
      summary: z.string(),
      issueCount: z.number(),
      recommendation: z.enum(['approve', 'approve_with_comments', 'request_changes']),
    }),
    tools: [listFilesTool, readFileTool, reviewIssueTool],
    runtimeOptions: { maxSteps: 20 },
  });
}
