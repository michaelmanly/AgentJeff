# @agentjeff/adapters

Inference and workspace adapters for [AgentJeff](https://github.com/michaelmanly/agentjeff).

## Inference Adapter

### `BadgrAdapter`

Connects to [AI Badgr](https://aibadgr.com) — bring your own model key, pick any supported model.

```typescript
import { BadgrAdapter } from '@agentjeff/adapters';

const adapter = new BadgrAdapter();
const adapter = new BadgrAdapter({ model: 'gpt-4o' });
const adapter = new BadgrAdapter({
  apiKey: '...',
  baseURL: 'https://aibadgr.com/v1',
  model: 'claude-opus-4-7',
});
```

**Environment variables:** `BADGR_API_KEY`, `BADGR_BASE_URL`

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

## License

MIT
