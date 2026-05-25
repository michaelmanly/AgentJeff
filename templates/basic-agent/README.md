# basic-agent

The smallest possible AgentJeff agent. One tool, one agent, one run.

## Get started

```bash
cp .env.example .env    # add BADGR_API_KEY
npm install
npm start
```

## What it does

1. `src/agent.ts` — defines a `greet` tool and the `greeter` agent
2. `src/index.ts` — runs the agent with event streaming

## Customize it

- **Change the tool** — edit `greetTool` in `src/agent.ts`
- **Change the model** — pass `{ model: 'gpt-4o-mini' }` to `new BadgrAdapter()`
- **Use a different adapter** — see the [adapters guide](https://github.com/michaelmanly/agentjeff/blob/main/docs/adapters.md)
