# Adapters

AgentJeff separates inference from orchestration via the `InferenceAdapter` interface. Swap the adapter to change which LLM (or mock) drives your agents.

---

## BadgrAdapter (default)

Connects to [AI Badgr](https://aibadgr.com). Bring your own model key and pick any supported model — GPT-4o, Claude, Gemini, and more.

```bash
npm install @agentjeff/sdk openai
export BADGR_API_KEY=your_key_here
```

```typescript
import { BadgrAdapter } from '@agentjeff/sdk';

const adapter = new BadgrAdapter();                             // reads BADGR_API_KEY
const adapter = new BadgrAdapter({ model: 'gpt-4o' });
const adapter = new BadgrAdapter({ model: 'claude-opus-4-7' }); // or any other model
const adapter = new BadgrAdapter({
  apiKey: 'sk-...',
  baseURL: 'https://aibadgr.com/v1',
  model: 'gpt-4o-mini',
});
```

Get a key at [aibadgr.com](https://aibadgr.com).

---

## MockInferenceAdapter (for tests)

Script deterministic responses without hitting any LLM.

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

```typescript
{ role: 'system', content: 'You are a helpful assistant.' }
{ role: 'user', content: 'What is the weather in Tokyo?' }
{ role: 'assistant', content: null, toolCalls: [{ id: 'tc1', name: 'get_weather', arguments: { city: 'Tokyo' } }] }
{ role: 'tool', toolCallId: 'tc1', content: '{"condition":"sunny","tempC":22}' }
```
