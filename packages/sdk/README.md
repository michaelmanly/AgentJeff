# @agentjeff/sdk

Main entry point for [AgentJeff](https://github.com/michaelmanly/agentjeff) — a TypeScript framework for building AI agents with tool use and event streaming.

## Install

```bash
npm install @agentjeff/sdk zod openai
```

## Usage

```typescript
import { z } from 'zod';
import { defineAgent, defineTool, run } from '@agentjeff/sdk';

const greetTool = defineTool({
  name: 'greet',
  description: 'Generate a greeting',
  inputSchema: z.object({ name: z.string() }),
  outputSchema: z.object({ message: z.string() }),
  async execute({ name }) {
    return { message: `Hello, ${name}!` };
  },
});

const agent = defineAgent({
  name: 'greeter',
  instructions: 'Greet the user by calling the greet tool.',
  inputSchema: z.object({ user: z.string() }),
  outputSchema: z.object({ message: z.string() }),
  tools: [greetTool],
});

const result = await run(agent, { user: 'Alice' });
```

Set `BADGR_API_KEY` to use the default [AI Badgr](https://aibadgr.com) inference provider. To use a custom provider pass an `inferenceAdapter` to `executeRun`.

## Documentation

Full documentation, examples, and all packages at [github.com/michaelmanly/agentjeff](https://github.com/michaelmanly/agentjeff).

## License

MIT
