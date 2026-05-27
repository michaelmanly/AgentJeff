# Quickstart

Five minutes from zero to a running agent.

## Prerequisites

- Node.js 18+
- An API key — get one at [aibadgr.com](https://aibadgr.com) (or use `OPENAI_API_KEY` with the `OpenAIAdapter`)

---

## Option A — Use the CLI (fastest)

```bash
npx @agentjeff/cli init basic-agent
cd basic-agent
cp .env.example .env        # add your BADGR_API_KEY
npm install
npm start
```

You'll see the agent run loop in your terminal: events emitted, tool called, result returned.

To see all templates:

```bash
npx @agentjeff/cli templates
```

---

## Option B — Write it yourself

### 1. Install

```bash
npm install @agentjeff/sdk zod openai
```

### 2. Set your key

```bash
export BADGR_API_KEY=your_key_here
```

### 3. Define a tool

Tools are how the agent does real work. Give it a name, typed inputs, and an `execute` function.

```typescript
import { z } from 'zod';
import { defineTool } from '@agentjeff/sdk';

const fetchWeatherTool = defineTool({
  name: 'get_weather',
  description: 'Get current weather for a city',
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.object({ condition: z.string(), tempC: z.number() }),
  async execute({ city }) {
    // replace with a real API call
    return { condition: 'sunny', tempC: 22 };
  },
});
```

### 4. Define an agent

The agent gets instructions and knows which tools it can call. Input and output are Zod schemas.

```typescript
import { defineAgent } from '@agentjeff/sdk';

const weatherAgent = defineAgent({
  name: 'weather-bot',
  instructions: 'You are a weather assistant. Use get_weather to answer questions about the weather.',
  inputSchema: z.object({ question: z.string() }),
  outputSchema: z.object({ answer: z.string() }),
  tools: [fetchWeatherTool],
});
```

### 5. Run it

```typescript
import { run } from '@agentjeff/sdk';

const result = await run(
  weatherAgent,
  { question: 'What is the weather in Tokyo?' },
  {
    onEvent: (event) => console.log(`[${event.type}]`, event.payload),
  }
);

console.log(result.result?.answer);
// "It's currently sunny in Tokyo, 22°C."
```

---

## What just happened?

```
run() called
  │
  ├── LLM sees your instructions + question
  ├── LLM decides to call get_weather({ city: 'Tokyo' })
  ├── execute() runs → { condition: 'sunny', tempC: 22 }
  ├── LLM sees the tool result
  └── LLM writes the final answer → run.completed
```

Every step emits a typed event. Use `onEvent` to stream them to a UI, log them, or assert on them in tests.

---

## What's next?

- [Debugging](./debugging.md) — inspect events, mock the LLM, understand state
- [Adapters](./adapters.md) — swap in OpenAI, Anthropic, or write your own
- [Templates](../templates/) — ready-to-run project starters
- [Testing guide](./debugging.md#testing) — deterministic tests with `MockInferenceAdapter`
