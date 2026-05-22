# @agentjeff/runtime

Step-execution loop for [AgentJeff](https://github.com/michaelmanly/agentjeff) agents. Handles the infer → tool-call → state-update cycle.

Most users should install [`@agentjeff/sdk`](https://www.npmjs.com/package/@agentjeff/sdk) which re-exports `executeRun`.

## Usage

```typescript
import { executeRun } from '@agentjeff/runtime';

const run = await executeRun({
  agent,
  input: { ... },
  inferenceAdapter,
  onEvent: (event) => console.log(event.type, event.payload),
});
// run.status | run.result | run.state | run.events
```

## Documentation

Full documentation and all packages at [github.com/michaelmanly/agentjeff](https://github.com/michaelmanly/agentjeff).

## License

MIT
