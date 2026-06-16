# Engine — Local-First Autonomous Engineering Engine

A self-improving technical engine that observes a local repo, chooses objectives, proposes code changes, critiques and verifies them, scores results, and uses memory to improve over time.

## Quick Start

```bash
cd engine
npm run setup        # install dependencies for engine + sandbox-repo
npm run start        # start the engine
npm run metrics      # check current metrics (in another terminal)
npm run report       # generate and print a report
npm run stop         # gracefully stop
npm run resume       # resume from last checkpoint
```

## Requirements

- **Ollama** running locally with models pulled:
  ```bash
  ollama pull qwen2.5-coder:14b   # primary model
  ollama pull qwen2.5-coder:7b    # fast worker model
  ```
- If Ollama is unavailable the engine runs with a rule-based fallback adapter (no LLM, limited effectiveness).

## Architecture

### Two Continuous Loops

**Environment Loop** (every cycle):
```
observe → choose goal → propose action → critique → execute safely → verify → score → save memory
```

**Improvement Loop** (every 10 iterations):
```
review past results → compare strategies → update scenario weights → prune mistakes
```

### Components

| Component | Role |
|-----------|------|
| `Planner` | Chooses next objective using primary model (`qwen2.5-coder:14b`) |
| `Builder` | Generates code/test proposal for the objective |
| `Critic` | Reviews proposal before execution (uses fast model) |
| `Verifier` | Runs TypeScript compile + tests + regression checks |
| `Scorer` | Scores outcome 0–100 based on verification results |
| `Memory` | Persists all attempts, strategies, scores to `memory/` |
| `WorkerPool` | 3–5 parallel workers generating and verifying scenarios |

### Scenario Types

Workers rotate through 8 scenario types:
- `edge-case` — boundary/null/overflow handling
- `regression` — tests for functions that could silently break
- `performance` — timing-bounded tests
- `flaky-test` — exposing timing/state-pollution issues
- `adversarial-review` — malformed input, injection attempts
- `missing-test` — uncovered code paths
- `unsafe-change` — missing input validation
- `benchmark-degradation` — performance regression detection

### Scoring (0–100)

| Signal | Points |
|--------|--------|
| Verification passed | +40 |
| All tests passing | +20 |
| Critic approved | +15 |
| No regressions | +10 |
| Speed bonus | +5 |
| Regressions found | −30 |
| Lint errors | −10 |
| Forbidden patterns | −10 |
| Many warnings | −5 |

## Metrics

The key question: **Is the engine measurably better than it was 48 hours ago?**

Tracked metrics:
- `iterations`, `failures`, `avgCycleTimeMs`, `scoreTrend`
- Builder: `changesAttempted`, `changesAccepted`, `changesReverted`, `regressionRate`
- Critic: `correctWarnings`, `misses`, `falseAlarms`
- Scenario: `novelty`, `issueDiscoveryRate`, `duplicateRate`
- Verifier: `checksRun`, `failureCatchRate`, `noisyFailures`
- Improvement: `variantsTested`, `winRate`, `gainOverBaseline`

## Project Structure

```
engine/
  config/             # engine-settings.json, ollama-settings.json, permissions.json
  memory/             # attempts.jsonl, strategies.json, scenarios.json, scores.json
  src/
    orchestrator/     # Engine class, environment loop, improvement loop, reports
    planner/          # Objective selection + prompts
    builder/          # Proposal generation
    critic/           # Pre-execution review
    verifier/         # Tests, lint, regression checks
    scorer/           # Outcome scoring + metrics
    memory/           # Persistent store
    workers/          # Parallel scenario workers
    adapters/         # Ollama, repo, tests, logs, docker
    utils/            # logger, retry, events, id
  targets/
    sandbox-repo/     # TypeScript target with intentional bugs + tests
  artifacts/
    run-logs/         # Per-day engine logs
    reports/          # Markdown reports generated every 20 iterations
    diffs/            # Change diffs
```

## Reused from AgentJeff

- `InferenceAdapter` interface — `OllamaAdapter` implements the same contract as `BadgrAdapter`
- `LocalWorkspaceAdapter` pattern — sandboxed file I/O with exec in `RepoAdapter`
- `withRetry` utility — exponential backoff for all LLM and tool calls
- Event system — typed engine events emitted at each phase
- Workflow step pattern — each loop phase is a composable async function
