# Contributing to AgentJeff

Thanks for your interest. This guide covers how to get a working dev environment, where things live, and what the bar is for a good contribution.

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
git clone https://github.com/michaelmanly/agentjeff.git
cd agentjeff
npm install
```

## Running tests

```bash
npm test               # unit tests (no LLM required)
npm run test:scenarios # integration scenarios (no LLM required)
npm run lint           # TypeScript type check
```

All tests use `MockInferenceAdapter` and run fully offline. They must pass before any PR can merge.

## Package layout

```
packages/
  core/      — types only: Agent, Tool, Run, State, Adapter, Event, Policy
  runtime/   — executeRun() loop: infer → dispatch tools → emit events → checkpoint
  sdk/       — defineAgent, defineTool, run() convenience wrapper
  adapters/  — BadgrAdapter (OpenAI-compatible) and LocalWorkspaceAdapter
  workflow/  — step-based multi-stage workflow builder
  packs/     — ready-to-use workspace assistant and extraction agents
  testing/   — MockInferenceAdapter, runAndAssert, scenario runner
  cli/       — agentjeff CLI binary
  examples/  — reference implementations
```

The dependency direction is strictly: `core` ← `runtime` ← `sdk` ← everything else. Nothing in `core` or `runtime` should import from higher packages.

## What belongs where

| I want to… | Edit |
|---|---|
| Add a new event type | `packages/core/src/types/event.ts` |
| Change the run loop | `packages/runtime/src/runner.ts` |
| Add a new LLM provider | `packages/adapters/src/` (implement `InferenceAdapter`) |
| Add a built-in agent | `packages/packs/src/` |
| Add a CLI command | `packages/cli/src/index.ts` |
| Add a test utility | `packages/testing/src/` |

## Writing a new adapter

Implement `InferenceAdapter` from `@agentjeff/core`:

```typescript
import { InferenceAdapter, InferenceRequest, InferenceResponse } from '@agentjeff/core';

export class MyAdapter implements InferenceAdapter {
  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    // req.messages — full conversation history including tool results
    // req.tools    — JSON Schema tool definitions
    // return { content, toolCalls, usage }
  }
}
```

Message roles in `req.messages`:
- `system` / `user` / `assistant` — standard chat turns
- `assistant` with `toolCalls` — the model's tool-use turn
- `tool` with `toolCallId` — tool result keyed to the call that produced it

## Writing a test

Use `MockInferenceAdapter` to script the LLM's responses without a real API key:

```typescript
import { defineAgent, defineTool } from '@agentjeff/sdk';
import { MockInferenceAdapter, runAndAssert } from '@agentjeff/testing';
import { z } from 'zod';

const agent = defineAgent({ ... });

await runAndAssert(
  agent,
  { prompt: 'do the thing' },
  new MockInferenceAdapter([
    { content: null, toolCalls: [{ id: 'tc1', name: 'my_tool', arguments: { x: 1 } }] },
    { content: 'done' },
  ]),
  {
    status: 'completed',
    eventTypes: ['tool.called', 'tool.succeeded', 'run.completed'],
  }
);
```

## PR checklist

- [ ] `npm test` passes
- [ ] `npm run test:scenarios` passes
- [ ] `npm run lint` passes with no errors
- [ ] New behaviour covered by a test in `packages/runtime/src/__tests__/` or `packages/testing/src/run-scenarios.ts`
- [ ] No new packages added to `core` or `runtime` without discussion

## What we're not building (Phase 1)

To keep scope clear, the following are explicitly out of scope:

- Hosted cloud or managed infrastructure
- Billing or quota enforcement
- Marketplace or plugin registry
- Enterprise controls (SSO, audit logs, RBAC)
- Multi-agent coordination protocols
- Streaming transports (WebSocket, SSE) beyond the `onEvent` callback

If you want to build any of these, open an issue first to discuss.

## Opening issues

Before submitting a PR for a significant change, open an issue to discuss the approach. Bug fixes and documentation improvements can go straight to a PR.
