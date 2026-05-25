# AgentJeff

Every production AI agent needs the same scaffolding: a run loop that drives LLM-tool-state cycles, typed tool dispatch, event streaming for observability, and a testing harness that works without calling a real LLM. AgentJeff ships all of it as composable TypeScript packages. You own the agent logic — not the plumbing.

[AI Badgr](https://aibadgr.com) is the default inference provider. Swap it out via the adapter interface.

## What you get

- **Working run loop** — `executeRun` drives infer → dispatch → update-state → repeat so you don't write it
- **Typed tools with Zod** — input/output validated at definition time; schema errors surface before the LLM touches them
- **Full event trace** — every step emits a typed event (`tool.called`, `tool.succeeded`, `state.updated`, `run.completed`) you can stream, log, or assert on
- **Swappable inference** — built-in adapters for AI Badgr, OpenAI, and Anthropic; mock it entirely for tests
- **Pre-built packs** — workspace assistant and structured extraction agents ready to use or fork
- **Deterministic tests** — `MockInferenceAdapter` + `runAndAssert` let you test agent behavior without an LLM
- **CLI** — scaffold a project, run any agent, or stream events from the terminal

## Packages

| Package | Description |
|---|---|
| [`@agentjeff/sdk`](packages/sdk) | Main entry point — `defineAgent`, `defineTool`, `run()` |
| [`@agentjeff/core`](packages/core) | Type definitions: Agent, Tool, Run, State, Adapter, Event, Policy |
| [`@agentjeff/runtime`](packages/runtime) | Step-execution loop (`executeRun`) |
| [`@agentjeff/adapters`](packages/adapters) | `BadgrAdapter`, `OpenAIAdapter`, `AnthropicAdapter`, `LocalWorkspaceAdapter` |
| [`@agentjeff/workflow`](packages/workflow) | Step-based multi-stage workflow builder |
| [`@agentjeff/packs`](packages/packs) | Pre-built workspace assistant and structured extraction packs |
| [`@agentjeff/testing`](packages/testing) | `MockInferenceAdapter`, `runAndAssert`, scenario runner |
| [`@agentjeff/cli`](packages/cli) | `agentjeff` CLI binary |
| [`@agentjeff/examples`](packages/examples) | Reference agent implementations |

## Quick Start

### Option A — Use the CLI (fastest)

```bash
npx @agentjeff/cli init basic-agent
cd basic-agent
cp .env.example .env        # add BADGR_API_KEY
npm install
npm start
```

See all templates:

```bash
npx @agentjeff/cli templates
```

### Option B — Write it yourself

```bash
npm install @agentjeff/sdk zod openai
export BADGR_API_KEY=your_key_here
```

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
  { onEvent: (event) => console.log(`[${event.type}]`, event.payload) },
);

console.log(result.result?.summary);
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

## Templates

Ready-to-run project starters. Scaffold with the CLI:

```bash
npx @agentjeff/cli init basic-agent     # minimal single-tool agent
npx @agentjeff/cli init researcher      # multi-step research + report
npx @agentjeff/cli init code-reviewer   # reads a workspace, records issues
npx @agentjeff/cli init data-pipeline   # fetch → validate → transform → store
```

Or copy from [`templates/`](templates/) directly.

## Adapters

Swap the LLM with one line:

```typescript
import { BadgrAdapter } from '@agentjeff/sdk';              // default (AI Badgr)
import { OpenAIAdapter, AnthropicAdapter } from '@agentjeff/adapters'; // alternatives
import { MockInferenceAdapter } from '@agentjeff/testing';  // for tests

await executeRun({ agent, input, inferenceAdapter: new AnthropicAdapter() });
```

See [`docs/adapters.md`](docs/adapters.md) for full options and how to write your own.

## Examples

### Workspace Assistant

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

```typescript
import { extractionAgent } from '@agentjeff/packs';
import { executeRun, BadgrAdapter } from '@agentjeff/sdk';

const run = await executeRun({
  agent: extractionAgent,
  input: { text: 'Login button broken on mobile Safari — users can\'t sign in.' },
  inferenceAdapter: new BadgrAdapter(),
});
// { category: 'bug_report', priority: 'high', fields: {...}, summary: '...' }
```

More examples in [`packages/examples/`](packages/examples/src/).

## CLI

```bash
npx @agentjeff/cli run:workspace ./my-project "List all TypeScript files"
npx @agentjeff/cli run:extract "Payment fails at checkout for EU users"
npx @agentjeff/cli run:research "Rust ownership model"

# Scaffold a new project
npx @agentjeff/cli init basic-agent
npx @agentjeff/cli templates

# Stream all events
npx @agentjeff/cli run:workspace ./my-project --events
```

## Testing

```typescript
import { MockInferenceAdapter, runAndAssert } from '@agentjeff/testing';

await runAndAssert(
  agent,
  { content: 'some input' },
  new MockInferenceAdapter([
    { content: null, toolCalls: [{ id: 'tc1', name: 'my_tool', arguments: { foo: 'bar' } }] },
    { content: 'Done', toolCalls: [] },
  ]),
  {
    status: 'completed',
    eventTypes: ['tool.called', 'tool.succeeded'],
  }
);
```

## Documentation

| Guide | Description |
|---|---|
| [Quickstart](docs/quickstart.md) | From zero to a running agent in 5 minutes |
| [Debugging](docs/debugging.md) | Events, state, testing, common failures |
| [Adapters](docs/adapters.md) | OpenAI, Anthropic, custom providers |

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
| `BADGR_API_KEY` | API key for AI Badgr (default adapter) |
| `BADGR_BASE_URL` | Override base URL (default: `https://aibadgr.com/v1`) |
| `OPENAI_API_KEY` | API key for OpenAI (when using `OpenAIAdapter`) |
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude (when using `AnthropicAdapter`) |

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for significant changes.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes and add tests
4. Run `npm run lint && npm test`
5. Open a pull request

## License

MIT
