# @agentjeff/workflow

Step-based workflow orchestration for [AgentJeff](https://github.com/michaelmanly/agentjeff). Chain multiple async steps with typed shared state.

## Usage

```typescript
import { createWorkflow } from '@agentjeff/workflow';

const workflow = createWorkflow<{ text: string; result?: string }>()
  .step('preprocess', async (state) => ({
    ...state,
    text: state.text.trim().toLowerCase(),
  }))
  .step('analyze', async (state, ctx) => ({
    ...state,
    result: await someAnalysis(state.text),
  }));

const final = await workflow.run({ text: '  Hello World  ' }, ctx);
console.log(final.result);
```

Useful for multi-stage pipelines where each step builds on the previous output — e.g., fetch → transform → store.

## Documentation

Full documentation and all packages at [github.com/michaelmanly/agentjeff](https://github.com/michaelmanly/agentjeff).

## License

MIT
