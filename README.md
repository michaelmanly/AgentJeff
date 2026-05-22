# AgentJeff

Every production AI agent needs the same scaffolding: a run loop that drives LLM-tool-state cycles, typed tool dispatch, event streaming for observability, and a testing harness that works without calling a real LLM. AgentJeff ships all of it as composable TypeScript packages. You own the agent logic — not the plumbing.

[AI Badgr](https://aibadgr.com) is the default inference provider. Swap it out via the adapter interface.

## What you get

- **Working run loop** — `executeRun` drives infer → dispatch → update-state → repeat so you don't write it
- **Typed tools with Zod** — input/output validated at definition time; schema errors surface before the LLM touches them
- **Full event trace** — every step emits a typed event (`tool.called`, `tool.succeeded`, `state.updated`, `run.completed`) you can stream, log, or assert on
- **Swappable inference** — `BadgrAdapter` works against any OpenAI-compatible endpoint; mock it entirely for tests
- **Pre-built packs** — workspace assistant and structured extraction agents ready to use or fork
- **Deterministic tests** — `MockInferenceAdapter` + `runAndAssert` let you test agent behavior without an LLM
- **CLI** — run any agent from the terminal without writing code

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

**Start with `@agentjeff/sdk`.** The other packages are available for lower-level access or framework extensions — ignore them until you need them.

## Quick Start

```bash
npm install @agentjeff/sdk zod openai
export BADGR_API_KEY=your_key_here
```

Define an agent and watch the run lifecycle:

```typescript
import { z } from 'zod';
import { defineAgent, defineTool, run } from '@agentjeff/sdk';

const summarizeTool = defineTool({
  name: 'summarize',
  description: 'Summarize a block of text into bullet points',
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({ bullets: z.array(z.string()) }),
  async execute({ text }) {
    return { bullets: text.split('. ').map(s => s.trim()).filter(Boolean) };
  },
});

const agent = defineAgent({
  name: 'analyst',
  instructions: 'Summarize the given content using the summarize tool.',
  inputSchema: z.object({ content: z.string() }),
  outputSchema: z.object({ summary: z.string() }),
  tools: [summarizeTool],
});

const result = await run(
  agent,
  { content: 'AgentJeff owns the loop. Your tool executes. State updates. Repeat.' },
  {
    onEvent: (event) => console.log(`[${event.type}]`, event.payload),
  },
);
// [run.started]    { runId: 'run_abc123', agentName: 'analyst' }
// [tool.called]    { name: 'summarize', input: { text: '...' } }
// [tool.succeeded] { name: 'summarize', durationMs: 2 }
// [state.updated]  { step: 1 }
// [run.completed]  { steps: 2, durationMs: 583 }

console.log(result.summary);
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

await runAndAssert(
  agent,
  input,
  new MockInferenceAdapter([
    { content: null, toolCalls: [{ id: 'tc1', name: 'my_tool', arguments: { foo: 'bar' } }] },
    { content: 'Done', toolCalls: [] },
  ]),
  { status: 'completed', eventTypes: ['tool.called', 'tool.succeeded'] }
);
```

## Development

```bash
git clone https://github.com/michaelmanly/agentjeff.git
cd agentjeff
npm install

npm run build          # build all packages
npm run build:watch    # watch mode
npm run demo           # mock demo, no API key needed
npm test               # run tests
npm run test:scenarios # run 6 mock scenarios
npm run lint           # type check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor setup path.

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
