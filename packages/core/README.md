# @agentjeff/core

Core type definitions for [AgentJeff](https://github.com/michaelmanly/agentjeff): `AgentDef`, `ToolDef`, `Run`, `AgentState`, `AgentEvent`, `InferenceAdapter`, `WorkspaceAdapter`, and execution policies.

This package is a peer dependency of all other AgentJeff packages. Most users should install [`@agentjeff/sdk`](https://www.npmjs.com/package/@agentjeff/sdk) instead.

## Key Types

- **`AgentDef<TInput, TOutput>`** — agent definition (instructions, schemas, tools, runtime options)
- **`ToolDef<TInput, TOutput>`** — tool definition (name, description, schemas, execute fn)
- **`Run`** — execution result (status, result, state, events)
- **`AgentEvent`** — typed event union (`run.started`, `tool.called`, `tool.succeeded`, etc.)
- **`InferenceAdapter`** — interface for LLM providers
- **`WorkspaceAdapter`** — interface for file I/O (listFiles, readFile, writeFile)

## Documentation

Full documentation and all packages at [github.com/michaelmanly/agentjeff](https://github.com/michaelmanly/agentjeff).

## License

MIT
