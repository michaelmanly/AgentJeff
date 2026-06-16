# AgentJeff Engine

An autonomous engineering engine that continuously observes a sandbox repository, generates improvement proposals, critiques and verifies them, and learns from results.

## Architecture

- **Orchestrator**: Main engine lifecycle (start/pause/stop/resume)
- **Environment Loop**: observe → plan → build → critique → execute → verify → score → save
- **Improvement Loop**: review → compare strategies → tune weights
- **Planner**: Chooses next objective using Ollama inference
- **Builder**: Generates code change proposals
- **Critic**: Reviews proposals before execution
- **Verifier**: Runs TypeScript compile + tests to verify changes
- **Scorer**: Scores outcomes 0-100
- **Memory**: Persists attempts, strategies, scenarios, scores as JSONL/JSON
- **Workers**: Parallel scenario workers for diversity

## Setup

```bash
npm run setup
```

## Usage

```bash
npm start          # Start the engine
npm run metrics    # View current metrics
npm run stop       # Stop the engine
```

## Configuration

- `config/engine-settings.json`: Main engine configuration
- `config/ollama-settings.json`: Ollama model settings
- `config/permissions.json`: Security permissions

## Requirements

- Ollama running locally with `qwen2.5-coder:14b` and `qwen2.5-coder:7b` models
- Node.js 20+
