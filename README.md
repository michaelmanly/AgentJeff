# agentjeff

AgentJeff is an npm-first TypeScript SDK for building tool-using AI agents with typed schemas, a run loop, and event tracing.

## Install

```bash
npm install agentjeff zod openai
```

## Quick start

```ts
import { z } from 'zod';
import { defineAgent, defineTool, run } from 'agentjeff';

const summarize = defineTool({
  name: 'summarize',
  description: 'Summarize text into bullets',
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({ bullets: z.array(z.string()) }),
  async execute({ text }) {
    return { bullets: text.split('. ').filter(Boolean) };
  },
});

const agent = defineAgent({
  name: 'analyst',
  instructions: 'Use summarize and return a short answer.',
  inputSchema: z.object({ content: z.string() }),
  outputSchema: z.string(),
  tools: [summarize],
});

const result = await run(agent, { content: 'Own your logic. Let AgentJeff run the loop.' });
console.log(result.result);
```

## Public API

`agentjeff` exports the SDK-facing API only:

- `defineAgent`, `defineTool`
- `run`, `executeRun`
- `BadgrAdapter`, `LocalWorkspaceAdapter`
- Core public types (`AgentDef`, `ToolDef`, `Run`, `AgentEvent`, etc.)

Monorepo internals are not part of the public package surface.

## Demo

After install:

```bash
npm run demo
```

## Environment

- `BADGR_API_KEY` for live inference with `BadgrAdapter`
- `BADGR_BASE_URL` to override the default API endpoint

## License

MIT
