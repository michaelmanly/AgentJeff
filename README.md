# AgentJeff

A TypeScript framework for building AI agents with tool use, structured workflows, and event streaming. Define agents, wire up tools with Zod schemas, and run them against any LLM — batteries included with [AI Badgr](https://aibadgr.com) as the default inference provider.

## Features

- **Typed agents & tools** — input/output validated with Zod at definition time
- **Step-execution runtime** — LLM infers → calls tools → updates state → repeats
- **Event streaming** — every action emits a typed event (tool calls, completions, checkpoints)
- **Pluggable adapters** — swap out the inference provider or file I/O backend
- **Domain packs** — pre-built workspace assistant and structured extraction agents
- **Testing harness** — mock inference adapter + assertion helpers for deterministic tests
- **CLI** — run agents from the terminal without writing code

## Packages

| Package | Description |
|---|---|
| [`@agentjeff/sdk`](packages/sdk) | Main entry point — `defineAgent`, `defineTool`, `run()` |
| [`@agentjeff/core`](packages/core) | Type definitions: Agent, Tool, Run, State, Adapter, Event, Policy |
| [`@agentjeff/runtime`](packages/runtime) | Step-execution loop (`executeRun`) |
| [`@agentjeff/adapters`](packages/adapters) | `BadgrAdapter` (AI Badgr / OpenAI-compatible) and `LocalWorkspaceAdapter` |
| [`@agentjeff/workflow`](packages/workflow) | Step-based multi-stage workflow builder |
| [`@agentjeff/packs`](packages/packs) | Pre-built workspace assistant and structured extraction packs |
| [`@agentjeff/testing`](packages/testing) | `MockInferenceAdapter`, `runAndAssert`, scenario runner |
| [`@agentjeff/cli`](packages/cli) | `agentjeff` CLI binary |
| [`@agentjeff/examples`](packages/examples) | Reference agent implementations |

## Quick Start

```bash
npm install @agentjeff/sdk zod openai
```

Set your API key:

```bash
export BADGR_API_KEY=your_key_here
```

Define an agent and run it:

```typescript
import { z } from 'zod';
import { defineAgent, defineTool, run } from '@agentjeff/sdk';

const greetTool = defineTool({
  name: 'greet',
  description: 'Generate a greeting for a user',
  inputSchema: z.object({ name: z.string() }),
  outputSchema: z.object({ message: z.string() }),
  async execute({ name }) {
    return { message: `Hello, ${name}!` };
  },
});

const agent = defineAgent({
  name: 'greeter',
  instructions: 'You are a friendly greeter. Use the greet tool to greet users.',
  inputSchema: z.object({ user: z.string() }),
  outputSchema: z.object({ message: z.string() }),
  tools: [greetTool],
});

const result = await run(agent, { user: 'Alice' });
console.log(result); // { message: 'Hello, Alice!' }
```

## How It Works

```
defineAgent + defineTool
        │
        ▼
   executeRun()
        │
   ┌────▼────┐
   │  Loop   │  up to maxSteps
   │ ───────  │
   │ 1. LLM infers (InferenceAdapter)
   │ 2. Tool calls? → execute tools
   │ 3. Emit events
   │ 4. Final answer? → return Run
   └─────────┘
        │
      Run { status, result, state, events }
```

Each step emits typed events you can subscribe to:

```typescript
await run(agent, input, {
  onEvent: (event) => {
    console.log(event.type, event.payload);
    // run.started | tool.called | tool.succeeded | tool.failed
    // state.updated | checkpoint.created | run.completed | run.failed
  },
});
```

## Examples

### Workspace Assistant

Reads and summarizes a code repository:

```typescript
import { buildWorkspaceAgent } from '@agentjeff/packs';
import { executeRun, BadgrAdapter } from '@agentjeff/sdk';

const agent = buildWorkspaceAgent('./my-project');
const run = await executeRun({
  agent,
  input: { task: 'Summarize the project structure', path: '.' },
  inferenceAdapter: new BadgrAdapter(),
});
console.log(run.result.summary);
```

### Structured Extraction

Classifies and extracts fields from raw text:

```typescript
import { extractionAgent } from '@agentjeff/packs';
import { executeRun, BadgrAdapter } from '@agentjeff/sdk';

const run = await executeRun({
  agent: extractionAgent,
  input: { text: 'Login button broken on mobile Safari — users can\'t sign in.' },
  inferenceAdapter: new BadgrAdapter(),
});
console.log(run.result);
// { category: 'bug_report', priority: 'high', fields: {...}, summary: '...' }
```

## CLI

```bash
npx @agentjeff/cli run:workspace ./my-project "List all TypeScript files"
npx @agentjeff/cli run:extract "Payment fails at checkout for EU users"

# Stream all events
npx @agentjeff/cli run:workspace ./my-project --events
```

## Testing

Use `MockInferenceAdapter` and `runAndAssert` for deterministic tests that don't hit a real LLM:

```typescript
import { MockInferenceAdapter, runAndAssert } from '@agentjeff/testing';

await runAndAssert(agent, input, {
  adapter: new MockInferenceAdapter([
    { content: null, toolCalls: [{ name: 'my_tool', input: { foo: 'bar' } }] },
    { content: 'Done', toolCalls: [] },
  ]),
  expectedStatus: 'completed',
  expectedEvents: ['tool.called', 'tool.succeeded'],
});
```

## Development

```bash
git clone https://github.com/michaelmanly/agentjeff.git
cd agentjeff
npm install

npm run build          # build all packages
npm run build:watch    # watch mode
npm test               # run tests
npm run lint           # type check
```

## Environment Variables

| Variable | Description |
|---|---|
| `BADGR_API_KEY` | API key for AI Badgr inference |
| `BADGR_BASE_URL` | Override the AI Badgr base URL (default: `https://aibadgr.com/v1`) |

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for significant changes.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes and add tests
4. Run `npm run lint && npm test`
5. Open a pull request

## License

MIT
