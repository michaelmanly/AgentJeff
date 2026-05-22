# @agentjeff/packs

Pre-built domain packs for [AgentJeff](https://github.com/michaelmanly/agentjeff). Drop-in agents and tool bundles for common tasks.

## Packs

### Workspace Assistant

An agent that can read, write, and summarize code repositories.

```typescript
import { buildWorkspaceAssistant } from '@agentjeff/packs';
import { executeRun, BadgrAdapter } from '@agentjeff/sdk';

const agent = buildWorkspaceAssistant('./my-project');
const run = await executeRun({
  agent,
  input: { task: 'Summarize the project structure', path: '.' },
  inferenceAdapter: new BadgrAdapter(),
});
console.log(run.result.summary);
```

### Structured Extraction

An agent that classifies text and extracts structured fields.

```typescript
import { extractionAgent } from '@agentjeff/packs';
import { executeRun, BadgrAdapter } from '@agentjeff/sdk';

const run = await executeRun({
  agent: extractionAgent,
  input: { text: 'Payment fails at checkout for EU users.' },
  inferenceAdapter: new BadgrAdapter(),
});
// { category: 'bug_report', priority: 'high', fields: {...}, summary: '...' }
console.log(run.result);
```

## Documentation

Full documentation and all packages at [github.com/michaelmanly/agentjeff](https://github.com/michaelmanly/agentjeff).

## License

MIT
