# @agentjeff/adapters

Inference and workspace adapters for [AgentJeff](https://github.com/michaelmanly/agentjeff).

## Inference Adapters

### `BadgrAdapter`

Connects to [AI Badgr](https://aibadgr.com) — an OpenAI-compatible LLM inference API.

```typescript
import { BadgrAdapter } from '@agentjeff/adapters';

const adapter = new BadgrAdapter();
const adapter = new BadgrAdapter({ model: 'gpt-4o', apiKey: '...', baseURL: '...' });
```

**Environment variables:** `BADGR_API_KEY`, `BADGR_BASE_URL`

---

### `OpenAIAdapter`

Direct OpenAI (or any OpenAI-compatible endpoint: Together, Groq, Fireworks, Ollama…).

```bash
npm install @agentjeff/adapters openai
export OPENAI_API_KEY=sk-...
```

```typescript
import { OpenAIAdapter } from '@agentjeff/adapters';

const adapter = new OpenAIAdapter();
const adapter = new OpenAIAdapter({ model: 'gpt-4o-mini' });
const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'mistralai/Mistral-7B-Instruct-v0.2',
  baseURL: 'https://api.together.xyz/v1',     // any compatible endpoint
});
```

---

### `AnthropicAdapter`

Runs agents on Claude models via the Anthropic SDK.

```bash
npm install @agentjeff/adapters @anthropic-ai/sdk
export ANTHROPIC_API_KEY=sk-ant-...
```

```typescript
import { AnthropicAdapter } from '@agentjeff/adapters';

const adapter = new AnthropicAdapter();
const adapter = new AnthropicAdapter({ model: 'claude-opus-4-7' });
const adapter = new AnthropicAdapter({ model: 'claude-sonnet-4-6' });
```

**Supported models:** `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`

The adapter handles Anthropic's message format differences automatically (system extraction, tool result grouping, content block conversion).

---

## Workspace Adapter

### `LocalWorkspaceAdapter`

File I/O adapter for agents that need to read/write the local filesystem.

```typescript
import { LocalWorkspaceAdapter } from '@agentjeff/adapters';

const ws = new LocalWorkspaceAdapter({ root: './my-project' });
await ws.listFiles('src');           // ['index.ts', 'utils.ts', ...]
await ws.readFile('src/index.ts');   // file contents as string
await ws.writeFile('output.txt', 'hello');

// Enable shell command execution (opt-in)
const ws = new LocalWorkspaceAdapter({ root: '.', allowExec: true });
const { stdout, exitCode } = await ws.exec('npm test');
```

Path escape is detected automatically — attempts to read outside `root` throw.

---

## Writing your own adapter

See the [adapters guide](../../docs/adapters.md) for a full walkthrough.

```typescript
import type { InferenceAdapter, InferenceRequest, InferenceResponse } from '@agentjeff/core';

export class MyAdapter implements InferenceAdapter {
  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    // call your LLM ...
    return { content: '...', toolCalls: [] };
  }
}
```

## Documentation

Full docs at [github.com/michaelmanly/agentjeff](https://github.com/michaelmanly/agentjeff) · [Adapters guide](../../docs/adapters.md)

## License

MIT
