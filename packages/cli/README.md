# @agentjeff/cli

Command-line interface for [AgentJeff](https://github.com/michaelmanly/agentjeff). Run built-in agents from the terminal without writing code.

## Install

```bash
npm install -g @agentjeff/cli
# or run directly
npx @agentjeff/cli
```

Set your API key:

```bash
export BADGR_API_KEY=your_key_here
```

## Commands

### Workspace Assistant

Analyze or modify a code repository:

```bash
agentjeff run:workspace ./my-project
agentjeff run:workspace ./my-project "List all TypeScript files and their exports"
agentjeff run:workspace ./my-project --events   # stream all events
```

### Structured Extraction

Extract structured data from raw text:

```bash
agentjeff run:extract "Login button broken on mobile Safari"
agentjeff run:extract "Add dark mode support to the dashboard" --events
```

Output includes category, priority, key fields, and a summary.

## Documentation

Full documentation and all packages at [github.com/michaelmanly/agentjeff](https://github.com/michaelmanly/agentjeff).

## License

MIT
