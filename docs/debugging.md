# Debugging

How to understand what your agent is doing, fix problems, and write reliable tests.

---

## 1. Stream events to understand the run loop

Every step in the run loop emits a typed event. Add `onEvent` to see them all:

```typescript
const result = await run(agent, input, {
  onEvent: (event) => console.log(`[${event.type}]`, JSON.stringify(event.payload, null, 2)),
});
```

**Event types and what they mean:**

| Event | When it fires | Payload keys |
|---|---|---|
| `run.started` | Run begins | `runId`, `agentName` |
| `tool.called` | Agent calls a tool | `name`, `input`, `toolCallId` |
| `tool.succeeded` | Tool returned a value | `name`, `output`, `durationMs` |
| `tool.failed` | Tool threw an error | `name`, `error` |
| `state.updated` | State updated after step | `step`, `state` |
| `run.completed` | Run finished successfully | `steps`, `durationMs` |
| `run.failed` | Run ended in error | `error`, `steps` |
| `checkpoint.created` | Checkpoint saved | `step`, `checkpointData` |

### From the CLI

```bash
agentjeff run:workspace ./my-project --events
agentjeff run:extract "some text" --events
```

---

## 2. Inspect the Run object

`run()` and `executeRun()` return a `Run` object with the full history:

```typescript
const r = await run(agent, input);

console.log(r.status);       // 'completed' | 'failed' | 'timeout'
console.log(r.result);       // final output (matches outputSchema)
console.log(r.events);       // AgentEvent[] — full ordered trace
console.log(r.state);        // final AgentState

// Find specific events
const toolCalls = r.events.filter(e => e.type === 'tool.called');
console.log(toolCalls.map(e => e.payload));
```

---

## 3. Use MockInferenceAdapter for offline testing

`MockInferenceAdapter` lets you script exactly what the LLM says — no real LLM needed.

```typescript
import { MockInferenceAdapter, runAndAssert } from '@agentjeff/testing';

const adapter = new MockInferenceAdapter([
  // Turn 1: LLM calls a tool
  {
    content: null,
    toolCalls: [{ id: 'tc1', name: 'my_tool', arguments: { foo: 'bar' } }],
  },
  // Turn 2: LLM writes the final answer
  { content: 'Done!', toolCalls: [] },
]);

await runAndAssert(
  agent,
  { myInput: 'hello' },
  adapter,
  {
    status: 'completed',
    eventTypes: ['tool.called', 'tool.succeeded', 'run.completed'],
  }
);
```

### What `runAndAssert` checks

```typescript
await runAndAssert(agent, input, adapter, {
  status: 'completed',             // exact status match
  eventTypes: ['tool.called'],     // every listed type must appear
  stateIncludes: { step: 2 },      // subset match on final state
  result: { answer: 'hello' },     // subset match on result
});
```

---

## 4. Common failure modes

### Agent runs but status is `failed`

```typescript
const r = await run(agent, input);
if (r.status === 'failed') {
  // Find the error event
  const err = r.events.find(e => e.type === 'run.failed' || e.type === 'tool.failed');
  console.log(err?.payload);
}
```

Common causes:
- Tool `execute()` threw an exception — wrap in try/catch
- LLM returned output that didn't match `outputSchema` — check your schema and instructions
- Network error in the inference adapter — check your API key and connectivity

### Agent loops or hits `maxSteps`

The default is 10 steps. Raise it if your agent needs more:

```typescript
const agent = defineAgent({
  // ...
  runtimeOptions: { maxSteps: 25 },
});
```

Or add clearer instructions telling the agent to stop after completing the task.

### Tool called with wrong input

The runtime validates tool inputs against `inputSchema`. If validation fails, the agent sees the error and can retry. To debug:

```typescript
onEvent: (e) => {
  if (e.type === 'tool.failed') console.error('Tool error:', e.payload);
  if (e.type === 'tool.called') console.log('Tool input:', (e.payload as any).input);
}
```

### LLM not calling tools

Check that:
1. Tool names and descriptions are clear — the LLM decides based on these
2. Instructions explicitly tell the agent to use the tool (e.g., "Always call summarize before answering")
3. `tools` array is passed to `defineAgent`

---

## 5. Testing

### Unit test a single tool

Tools are plain async functions. Test them directly:

```typescript
import { fetchWeatherTool } from './agent';

test('get_weather returns correct shape', async () => {
  const result = await fetchWeatherTool.execute({ city: 'Tokyo' }, {} as any);
  expect(result).toMatchObject({ condition: expect.any(String), tempC: expect.any(Number) });
});
```

### Full agent test with MockInferenceAdapter

```typescript
import { MockInferenceAdapter, runAndAssert } from '@agentjeff/testing';

test('agent calls greet tool and completes', async () => {
  const adapter = new MockInferenceAdapter([
    {
      content: null,
      toolCalls: [{ id: 'tc1', name: 'greet', arguments: { name: 'Alice', style: 'casual' } }],
    },
    { content: 'Greeting sent!', toolCalls: [] },
  ]);

  await runAndAssert(
    agent,
    { name: 'Alice', style: 'casual' },
    adapter,
    { status: 'completed', eventTypes: ['tool.called', 'tool.succeeded'] }
  );
});
```

### Scenario testing

For larger test suites, use `runScenario` from `@agentjeff/testing`:

```typescript
import { runScenario } from '@agentjeff/testing';

await runScenario({
  name: 'greeter-casual',
  agent,
  input: { name: 'Bob', style: 'casual' },
  adapter: new MockInferenceAdapter([...]),
  expectedStatus: 'completed',
  outputDir: './test-output',   // writes result JSON for inspection
});
```

---

## 6. Type errors

### "Property X does not exist on type Run['result']"

`result` is typed as `z.infer<typeof outputSchema> | null`. Cast or narrow it:

```typescript
const r = result.result as { summary: string } | null;
console.log(r?.summary);
```

Or use Zod's `parse` to validate:

```typescript
import { MyOutputSchema } from './agent';
const parsed = MyOutputSchema.safeParse(result.result);
if (parsed.success) console.log(parsed.data.summary);
```

### Tool type inference breaks

Export your schemas and use `z.infer<>` to share types across files:

```typescript
// agent.ts
export const InputSchema = z.object({ city: z.string() });
export type AgentInput = z.infer<typeof InputSchema>;

// elsewhere
import type { AgentInput } from './agent';
```
