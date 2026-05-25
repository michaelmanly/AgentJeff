# Adapters

AgentJeff separates inference from orchestration via the `InferenceAdapter` interface. Swap the adapter to change which LLM (or mock) runs your agents.

---

## Built-in adapters

### BadgrAdapter (default)

Connects to [AI Badgr](https://aibadgr.com) — an OpenAI-compatible proxy.

```bash
npm install @agentjeff/sdk openai
export BADGR_API_KEY=your_key_here
```

```typescript
import { BadgrAdapter } from '@agentjeff/sdk';

const adapter = new BadgrAdapter();                        // reads BADGR_API_KEY
const adapter = new BadgrAdapter({ model: 'gpt-4o' });     // override model
const adapter = new BadgrAdapter({
  apiKey: 'sk-...',
  baseURL: 'https://your-proxy.example.com/v1',          // any OpenAI-compatible URL
});
```

---

### OpenAIAdapter

Direct OpenAI integration. Reads `OPENAI_API_KEY` by default.

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
  model: 'gpt-4o',
  baseURL: 'https://api.openai.com/v1',  // or any compatible endpoint
});
```

Works with any OpenAI-compatible endpoint: Together.ai, Fireworks, Groq, Ollama, LM Studio, etc. — just pass `baseURL`.

---

### AnthropicAdapter

Runs agents on Claude models. Reads `ANTHROPIC_API_KEY` by default.

```bash
npm install @agentjeff/adapters @anthropic-ai/sdk
export ANTHROPIC_API_KEY=sk-ant-...
```

```typescript
import { AnthropicAdapter } from '@agentjeff/adapters';

const adapter = new AnthropicAdapter();
const adapter = new AnthropicAdapter({ model: 'claude-opus-4-7' });
const adapter = new AnthropicAdapter({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-6',
});
```

**Supported models:** `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`

The adapter handles the Anthropic message format differences automatically:
- System messages extracted to the Anthropic `system` parameter
- Consecutive tool results grouped into a single user message
- Tool use content blocks converted to/from AgentJeff's `ToolCall` format

---

### MockInferenceAdapter (for tests)

Script deterministic responses without hitting a real LLM.

```typescript
import { MockInferenceAdapter } from '@agentjeff/testing';

const adapter = new MockInferenceAdapter([
  { content: null, toolCalls: [{ id: 'tc1', name: 'my_tool', arguments: { x: 1 } }] },
  { content: 'Done', toolCalls: [] },
]);
```

Responses are consumed in order. If the agent takes more turns than responses provided, it throws — a useful safety net in tests.

See [Debugging → Testing](./debugging.md#5-testing) for full examples.

---

## Write your own adapter

Implement the `InferenceAdapter` interface from `@agentjeff/core`:

```typescript
import type { InferenceAdapter, InferenceRequest, InferenceResponse } from '@agentjeff/core';

export class MyAdapter implements InferenceAdapter {
  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    // req.messages  — full conversation history (system, user, assistant, tool)
    // req.tools     — tools available to the LLM (name, description, parameters as JSON Schema)
    // req.model     — optional model override
    // req.temperature, req.maxTokens — optional generation params

    // Call your LLM API here ...

    return {
      content: 'The LLM text response, or null if it called a tool',
      toolCalls: [
        // Only populate when the LLM wants to call a tool
        { id: 'unique-id', name: 'tool_name', arguments: { key: 'value' } },
      ],
      usage: { promptTokens: 100, completionTokens: 50 },  // optional
    };
  }
}
```

### Message format reference

The `messages` array follows OpenAI message conventions:

```typescript
// System context
{ role: 'system', content: 'You are a helpful assistant.' }

// User turn
{ role: 'user', content: 'What is the weather in Tokyo?' }

// Assistant turn (text only)
{ role: 'assistant', content: 'Let me check.', toolCalls: [] }

// Assistant turn (tool call)
{
  role: 'assistant',
  content: null,
  toolCalls: [{ id: 'tc1', name: 'get_weather', arguments: { city: 'Tokyo' } }]
}

// Tool result
{ role: 'tool', toolCallId: 'tc1', content: '{"condition":"sunny","tempC":22}' }
```

### Adapter for a non-OpenAI provider (example)

```typescript
import type { InferenceAdapter, InferenceRequest, InferenceResponse } from '@agentjeff/core';

export class TogetherAdapter implements InferenceAdapter {
  private apiKey: string;
  private model: string;

  constructor(opts: { apiKey?: string; model?: string } = {}) {
    this.apiKey = opts.apiKey ?? process.env.TOGETHER_API_KEY ?? '';
    this.model = opts.model ?? 'mistralai/Mistral-7B-Instruct-v0.2';
  }

  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    const resp = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: req.model ?? this.model,
        messages: req.messages,                // Together is OpenAI-compatible
        tools: req.tools?.map((t) => ({
          type: 'function',
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
        temperature: req.temperature,
        max_tokens: req.maxTokens,
      }),
    });

    const data = await resp.json();
    const msg = data.choices[0].message;

    return {
      content: msg.content ?? null,
      toolCalls: (msg.tool_calls ?? []).map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments ?? '{}'),
      })),
    };
  }
}
```

Because Together.ai is OpenAI-compatible, you could also just use `OpenAIAdapter` with a custom `baseURL`:

```typescript
new OpenAIAdapter({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1',
  model: 'mistralai/Mistral-7B-Instruct-v0.2',
});
```

---

## Choosing an adapter

| Adapter | Best for | Needs |
|---|---|---|
| `BadgrAdapter` | Quickest start, AI Badgr users | `BADGR_API_KEY` |
| `OpenAIAdapter` | OpenAI or any compatible endpoint | `OPENAI_API_KEY` |
| `AnthropicAdapter` | Claude models | `ANTHROPIC_API_KEY`, `@anthropic-ai/sdk` |
| `MockInferenceAdapter` | Tests, offline dev | `@agentjeff/testing` |
| Custom | Any other provider | Implement `InferenceAdapter` |
