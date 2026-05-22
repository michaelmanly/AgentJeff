# @agentjeff/adapters

Inference and workspace adapters for [AgentJeff](https://github.com/michaelmanly/agentjeff).

## Adapters

### `BadgrAdapter`

Connects to [AI Badgr](https://aibadgr.com) — an OpenAI-compatible LLM inference API.

```typescript
import { BadgrAdapter } from '@agentjeff/adapters';

const adapter = new BadgrAdapter({ model: 'gpt-4o' }); // model optional
```

**Environment variables:**
- `BADGR_API_KEY` — your AI Badgr API key
- `BADGR_BASE_URL` — override base URL (default: `https://aibadgr.com/v1`)

### `LocalWorkspaceAdapter`

File I/O adapter for agents that need to read/write the local filesystem.

```typescript
import { LocalWorkspaceAdapter } from '@agentjeff/adapters';

const ws = new LocalWorkspaceAdapter({ root: './my-project' });
await ws.listFiles('src');
await ws.readFile('src/index.ts');
await ws.writeFile('output.txt', 'hello');
```

## Documentation

Full documentation and all packages at [github.com/michaelmanly/agentjeff](https://github.com/michaelmanly/agentjeff).

## License

MIT
