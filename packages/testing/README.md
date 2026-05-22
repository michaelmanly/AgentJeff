# @agentjeff/testing

Test harness for [AgentJeff](https://github.com/michaelmanly/agentjeff) agents. Run deterministic tests without hitting a real LLM.

## Usage

```typescript
import { MockInferenceAdapter, runAndAssert } from '@agentjeff/testing';

await runAndAssert(agent, { user: 'Alice' }, {
  adapter: new MockInferenceAdapter([
    // fixture responses the mock LLM will return in order
    { content: null, toolCalls: [{ name: 'greet', input: { name: 'Alice' } }] },
    { content: 'Done', toolCalls: [] },
  ]),
  expectedStatus: 'completed',
  expectedEvents: ['tool.called', 'tool.succeeded'],
});
```

### Scenario Runner

Run parameterized test scenarios from fixtures and write output artifacts:

```typescript
import { runScenario } from '@agentjeff/testing';

await runScenario({ agent, adapter, input, outputDir: './test-output' });
```

## Documentation

Full documentation and all packages at [github.com/michaelmanly/agentjeff](https://github.com/michaelmanly/agentjeff).

## License

MIT
