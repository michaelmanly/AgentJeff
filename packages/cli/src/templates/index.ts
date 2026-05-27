export interface TemplateFile {
  path: string;
  content: string;
}

export interface Template {
  name: string;
  description: string;
  files: TemplateFile[];
}

export const TEMPLATES: Template[] = [
  {
    name: 'basic-agent',
    description: 'Minimal agent with a single tool — the fastest path to a working agent',
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: 'my-basic-agent',
            version: '0.1.0',
            private: true,
            scripts: {
              start: 'tsx src/index.ts',
              test: 'jest',
            },
            dependencies: {
              '@agentjeff/sdk': '^0.1.0',
              zod: '^3.22.0',
              openai: '^4.0.0',
            },
            devDependencies: {
              tsx: '^4.7.0',
              typescript: '^5.4.0',
              '@types/node': '^20.0.0',
            },
          },
          null,
          2
        ),
      },
      {
        path: '.env.example',
        content: `# Copy this file to .env and fill in your key
BADGR_API_KEY=your_key_here
`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'CommonJS',
              moduleResolution: 'node',
              strict: true,
              esModuleInterop: true,
              outDir: 'dist',
            },
            include: ['src'],
          },
          null,
          2
        ),
      },
      {
        path: 'src/agent.ts',
        content: `import { z } from 'zod';
import { defineAgent, defineTool } from '@agentjeff/sdk';

const greetTool = defineTool({
  name: 'greet',
  description: 'Generate a greeting for a person',
  inputSchema: z.object({
    name: z.string().describe('The name to greet'),
    style: z.enum(['formal', 'casual']).default('casual'),
  }),
  outputSchema: z.object({ greeting: z.string() }),
  async execute({ name, style }) {
    const greeting =
      style === 'formal' ? \`Good day, \${name}.\` : \`Hey \${name}!\`;
    return { greeting };
  },
});

export const agent = defineAgent({
  name: 'greeter',
  instructions: \`You are a friendly assistant. When asked to greet someone,
use the greet tool with the appropriate style, then confirm the greeting was sent.\`,
  inputSchema: z.object({
    name: z.string(),
    style: z.enum(['formal', 'casual']).default('casual'),
  }),
  outputSchema: z.object({ message: z.string() }),
  tools: [greetTool],
  runtimeOptions: { maxSteps: 5 },
});
`,
      },
      {
        path: 'src/index.ts',
        content: `import { run } from '@agentjeff/sdk';
import { agent } from './agent';

async function main() {
  const result = await run(
    agent,
    { name: 'World', style: 'casual' },
    {
      onEvent: (event) => {
        console.log(\`[\${event.type}]\`, JSON.stringify(event.payload).slice(0, 80));
      },
    }
  );

  console.log('\\nResult:', result.result);
  console.log('Status:', result.status);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
`,
      },
    ],
  },
  {
    name: 'researcher',
    description: 'Multi-step research agent that searches, records findings, and writes a report',
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: 'my-researcher',
            version: '0.1.0',
            private: true,
            scripts: { start: 'tsx src/index.ts' },
            dependencies: {
              '@agentjeff/sdk': '^0.1.0',
              zod: '^3.22.0',
              openai: '^4.0.0',
            },
            devDependencies: { tsx: '^4.7.0', typescript: '^5.4.0', '@types/node': '^20.0.0' },
          },
          null,
          2
        ),
      },
      {
        path: '.env.example',
        content: `BADGR_API_KEY=your_key_here
# Or use OpenAI:
# OPENAI_API_KEY=your_key_here
`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'CommonJS',
              moduleResolution: 'node',
              strict: true,
              esModuleInterop: true,
            },
            include: ['src'],
          },
          null,
          2
        ),
      },
      {
        path: 'src/agent.ts',
        content: `import { z } from 'zod';
import { defineAgent, defineTool } from '@agentjeff/sdk';

// Replace this stub with a real search API (Serper, Tavily, Brave, etc.)
const searchTool = defineTool({
  name: 'search',
  description: 'Search for information on a topic',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({
    results: z.array(z.object({ title: z.string(), snippet: z.string() })),
  }),
  async execute({ query }) {
    // TODO: replace with real HTTP call, e.g.:
    // const resp = await fetch(\`https://api.search.example.com?q=\${query}&key=\${process.env.SEARCH_API_KEY}\`);
    return {
      results: [
        { title: \`Result for "\${query}"\`, snippet: \`Relevant info about \${query}...\` },
      ],
    };
  },
});

const recordFindingTool = defineTool({
  name: 'record_finding',
  description: 'Record a key finding to include in the final report',
  inputSchema: z.object({
    heading: z.string(),
    detail: z.string(),
    confidence: z.enum(['low', 'medium', 'high']),
  }),
  outputSchema: z.object({ recorded: z.boolean() }),
  async execute(_input) {
    return { recorded: true };
  },
});

export const researchAgent = defineAgent({
  name: 'researcher',
  instructions: \`You are a thorough research assistant.
1. Search for the topic at least twice with different queries
2. Record 2-4 key findings using record_finding
3. Write a clear, concise summary that synthesizes all findings
Always cite confidence levels and note limitations of your sources.\`,
  inputSchema: z.object({ topic: z.string() }),
  outputSchema: z.object({ summary: z.string(), findingCount: z.number() }),
  tools: [searchTool, recordFindingTool],
  runtimeOptions: { maxSteps: 15 },
});
`,
      },
      {
        path: 'src/index.ts',
        content: `import { run } from '@agentjeff/sdk';
import { researchAgent } from './agent';

const topic = process.argv[2] ?? 'TypeScript type inference';

async function main() {
  console.log(\`Researching: "\${topic}"\\n\`);

  const result = await run(
    researchAgent,
    { topic },
    {
      onEvent: (e) => {
        if (e.type === 'tool.called') {
          const payload = e.payload as { name: string; input: Record<string, unknown> };
          console.log(\`  → \${payload.name}(\${JSON.stringify(payload.input).slice(0, 60)})\`);
        }
      },
    }
  );

  console.log('\\n--- Research Report ---');
  console.log(result.result?.summary ?? result.result);
  console.log(\`\\nFindings recorded: \${result.result?.findingCount ?? 'n/a'}\`);
  console.log(\`Status: \${result.status}\`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
`,
      },
    ],
  },
  {
    name: 'code-reviewer',
    description: 'Code review agent that reads files from a workspace and reports issues',
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: 'my-code-reviewer',
            version: '0.1.0',
            private: true,
            scripts: { start: 'tsx src/index.ts' },
            dependencies: {
              '@agentjeff/sdk': '^0.1.0',
              zod: '^3.22.0',
              openai: '^4.0.0',
            },
            devDependencies: { tsx: '^4.7.0', typescript: '^5.4.0', '@types/node': '^20.0.0' },
          },
          null,
          2
        ),
      },
      {
        path: '.env.example',
        content: `BADGR_API_KEY=your_key_here
`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'CommonJS',
              moduleResolution: 'node',
              strict: true,
              esModuleInterop: true,
            },
            include: ['src'],
          },
          null,
          2
        ),
      },
      {
        path: 'src/agent.ts',
        content: `import { z } from 'zod';
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
    description: 'Record a code review issue',
    inputSchema: z.object({
      file: z.string(),
      line: z.number().optional(),
      severity: z.enum(['info', 'warning', 'error']),
      message: z.string(),
      suggestion: z.string().optional(),
    }),
    outputSchema: z.object({ ok: z.boolean() }),
    async execute(_input) {
      return { ok: true };
    },
  });

  return defineAgent({
    name: 'code-reviewer',
    instructions: \`You are a senior engineer doing a code review.
1. List files to understand the structure
2. Read relevant source files
3. Record each issue with add_issue — be specific and actionable
4. Write a summary with an overall recommendation

Prioritize: correctness > security > performance > style.\`,
    inputSchema: z.object({
      task: z.string().default('Review this codebase for issues'),
      focusPath: z.string().optional(),
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
`,
      },
      {
        path: 'src/index.ts',
        content: `import { executeRun, BadgrAdapter } from '@agentjeff/sdk';
import { buildCodeReviewAgent } from './agent';
import path from 'path';

const target = process.argv[2] ?? '.';
const absPath = path.resolve(target);

async function main() {
  console.log(\`Reviewing: \${absPath}\\n\`);

  const agent = buildCodeReviewAgent(absPath);
  const result = await executeRun({
    agent,
    input: { task: 'Review this codebase for issues', focusPath: absPath },
    inferenceAdapter: new BadgrAdapter(),
    onEvent: (e) => {
      if (e.type === 'tool.called') {
        const p = e.payload as { name: string; input: Record<string, unknown> };
        console.log(\`  [\${p.name}] \${JSON.stringify(p.input).slice(0, 70)}\`);
      }
    },
  });

  const r = result.result;
  console.log('\\n--- Review Summary ---');
  console.log(r?.summary);
  console.log(\`\\nIssues found: \${r?.issueCount ?? 'n/a'}\`);
  console.log(\`Recommendation: \${r?.recommendation ?? 'n/a'}\`);
  console.log(\`Status: \${result.status}\`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
`,
      },
    ],
  },
  {
    name: 'data-pipeline',
    description: 'Multi-stage workflow: fetch → validate → transform → store',
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: 'my-data-pipeline',
            version: '0.1.0',
            private: true,
            scripts: { start: 'tsx src/index.ts' },
            dependencies: {
              '@agentjeff/sdk': '^0.1.0',
              '@agentjeff/workflow': '^0.1.0',
              zod: '^3.22.0',
              openai: '^4.0.0',
            },
            devDependencies: { tsx: '^4.7.0', typescript: '^5.4.0', '@types/node': '^20.0.0' },
          },
          null,
          2
        ),
      },
      {
        path: '.env.example',
        content: `BADGR_API_KEY=your_key_here
`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'CommonJS',
              moduleResolution: 'node',
              strict: true,
              esModuleInterop: true,
            },
            include: ['src'],
          },
          null,
          2
        ),
      },
      {
        path: 'src/pipeline.ts',
        content: `import { Workflow } from '@agentjeff/workflow';

interface PipelineState {
  rawData?: Record<string, unknown>[];
  validRows?: Record<string, unknown>[];
  transformed?: string[];
  outputPath?: string;
}

export const pipeline = new Workflow<PipelineState>('data-pipeline')
  .step('fetch', async (state, _ctx) => {
    // Replace with a real HTTP call, database query, file read, etc.
    const rawData = [
      { id: 1, name: 'Alice', score: '92' },
      { id: 2, name: '', score: 'bad' },   // invalid row
      { id: 3, name: 'Bob', score: '75' },
    ];
    console.log(\`  [fetch] loaded \${rawData.length} rows\`);
    return { ...state, rawData };
  })
  .step('validate', async (state, _ctx) => {
    const validRows = (state.rawData ?? []).filter(
      (r) => r.name && !isNaN(Number(r.score))
    );
    console.log(\`  [validate] \${validRows.length} valid / \${(state.rawData?.length ?? 0) - validRows.length} rejected\`);
    return { ...state, validRows };
  })
  .step('transform', async (state, _ctx) => {
    const transformed = (state.validRows ?? []).map(
      (r) => \`\${r.name}: score=\${Number(r.score)}\`
    );
    console.log(\`  [transform] produced \${transformed.length} records\`);
    return { ...state, transformed };
  })
  .step('store', async (state, _ctx) => {
    // Replace with a real write: DB insert, S3 upload, file write, etc.
    const outputPath = '/tmp/pipeline-output.json';
    console.log(\`  [store] writing to \${outputPath}\`);
    return { ...state, outputPath };
  });
`,
      },
      {
        path: 'src/index.ts',
        content: `import { pipeline } from './pipeline';

async function main() {
  console.log('Running data pipeline...\\n');

  const result = await pipeline.run({});

  console.log('\\n--- Pipeline Complete ---');
  console.log('Output:', result.outputPath);
  console.log('Records:', result.transformed?.length ?? 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
`,
      },
    ],
  },
];

export function getTemplate(name: string): Template | undefined {
  return TEMPLATES.find((t) => t.name === name);
}
