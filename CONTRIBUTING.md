# Contributing

## 30-minute setup

Follow this path to go from zero to a real contribution.

### 1. Install and build

```bash
git clone https://github.com/michaelmanly/agentjeff.git
cd agentjeff
npm install
npm run build
```

All packages compile. No errors.

### 2. Run the demo

```bash
npm run demo
```

No API key needed. Runs a mock-driven agent and prints the full event stream:

```
AgentJeff demo — mock adapter, no API key required

  [run.started      ] {"agentName":"researcher","input":{"question":"..."}}
  [tool.called      ] {"tool":"lookup","args":{"topic":"run loop"}}
  [tool.succeeded   ] {"tool":"lookup","output":{"facts":[...]}}
  [state.updated    ] {"state":{"currentStep":"step_1",...}}
  [run.completed    ] {"result":"AgentJeff owns the loop..."}

Result: AgentJeff owns the loop. You define tools — the runtime drives infer, dispatch, and state.
Status:  completed | Steps: 1 | Events: 5

Next: npm run test:scenarios
```

### 3. Run test scenarios and inspect artifacts

```bash
npm run test:scenarios
```

Runs 6 scenarios using `MockInferenceAdapter` — no LLM. All 6 should pass. Artifacts land in `test-artifacts/`:

```bash
ls test-artifacts/
cat test-artifacts/summary.md
cat test-artifacts/scenario-01-workspace-agent-run.json
```

The JSON artifacts are complete `Run` objects: status, events array, state, result. This is what every agent produces.

### 4. Understand package boundaries

| Package | What it owns | Touch when |
|---|---|---|
| `@agentjeff/core` | Types: `AgentDef`, `Run`, `ToolDef`, `AgentEvent` | Changing the data model |
| `@agentjeff/runtime` | The infer → tool → update loop (`executeRun`) | Changing execution logic |
| `@agentjeff/adapters` | LLM + workspace I/O | Adding a new inference provider |
| `@agentjeff/sdk` | Assembles the above; the public API | Almost never |
| `@agentjeff/testing` | `MockInferenceAdapter`, `runAndAssert`, scenario runner | Writing tests |
| `@agentjeff/workflow` | Multi-step pipeline builder | Orchestration changes |
| `@agentjeff/packs` | Pre-built workspace + extraction agents | Domain agent changes |
| `@agentjeff/cli` | `agentjeff` binary | CLI changes |

**Start here for most changes:** `packages/runtime/src/runner.ts` — this is the execution engine. Read it first.

### 5. Find a first issue

These are real gaps, not contrived tasks:

- **`maxSteps` exceeded produces wrong status** — when the loop hits `maxSteps`, `runner.ts` still emits `run.completed` with `result: undefined`. It should emit `run.interrupted` and set `run.status = 'interrupted'`. Add a test in `packages/runtime/src/__tests__/runner.test.ts` and a scenario in `run-scenarios.ts`.

- **Silent tool skip** — in `runner.ts`, tool calls for unknown tool names are silently skipped with `continue`. Should emit a `tool.failed` event instead so the agent knows the tool wasn't found.

- **Generic result type** — `executeRun` returns `Run` with `result: unknown`. A `executeRun<TResult>` generic would give typed results with no runtime change.

- **Add a missing scenario** — `packages/testing/src/run-scenarios.ts` has 6 scenarios. A good addition: test that `maxSteps` exceeded produces `run.interrupted` (once the above bug is fixed).

Check [open issues](https://github.com/michaelmanly/agentjeff/issues) for more.

---

## Development workflow

```bash
npm run build          # build all packages
npm run build:watch    # watch mode — keep running while you work
npm run demo           # mock demo, no API key needed
npm test               # Jest unit tests
npm run test:scenarios # 6 mock scenarios
npm run lint           # TypeScript type check
```

## PR checklist

- `npm run lint` passes (no type errors)
- `npm test` passes
- New behavior has a scenario in `packages/testing/src/run-scenarios.ts` or a test in `packages/runtime/src/__tests__/`
- No new `any` casts without an inline comment
