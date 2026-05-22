// src/harness.ts
import { executeRun } from "@agentjeff/runtime";
var MockInferenceAdapter = class {
  responses;
  index = 0;
  constructor(responses) {
    this.responses = responses;
  }
  async complete(_req) {
    const r = this.responses[this.index++ % this.responses.length];
    return {
      content: r.content,
      toolCalls: r.toolCalls ?? []
    };
  }
};
async function runAndAssert(agent, input, adapter, assertions) {
  const run = await executeRun({ agent, input, inferenceAdapter: adapter });
  if (assertions.status) {
    if (run.status !== assertions.status) {
      throw new Error(`Expected status ${assertions.status}, got ${run.status}`);
    }
  }
  if (assertions.eventTypes) {
    const seen = new Set(run.events.map((e) => e.type));
    for (const t of assertions.eventTypes) {
      if (!seen.has(t)) {
        throw new Error(`Expected event type '${t}' not found in run`);
      }
    }
  }
  if (assertions.stateContains) {
    for (const [k, v] of Object.entries(assertions.stateContains)) {
      const actual = run.state[k];
      if (JSON.stringify(actual) !== JSON.stringify(v)) {
        throw new Error(
          `State mismatch for key '${k}': expected ${JSON.stringify(v)}, got ${JSON.stringify(actual)}`
        );
      }
    }
  }
  if (assertions.resultContains && !assertions.resultContains(run.result)) {
    throw new Error(`Result assertion failed`);
  }
  return run;
}

// src/scenarios.ts
import fs from "fs/promises";
import path from "path";
import { executeRun as executeRun2 } from "@agentjeff/runtime";
async function runScenario(scenarioNumber, name, opts) {
  const start = Date.now();
  let run;
  try {
    run = await executeRun2({
      agent: opts.agent,
      input: opts.input,
      inferenceAdapter: opts.adapter
    });
    opts.assert(run);
    const result = {
      scenario: scenarioNumber,
      name,
      status: "pass",
      runStatus: run.status,
      eventCount: run.events.length,
      durationMs: Date.now() - start,
      events: run.events,
      state: run.state,
      result: run.result
    };
    if (opts.artifactsDir) await writeArtifacts(opts.artifactsDir, scenarioNumber, name, result, run);
    return result;
  } catch (err) {
    const result = {
      scenario: scenarioNumber,
      name,
      status: "fail",
      runStatus: run?.status,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      events: run?.events,
      state: run?.state
    };
    if (opts.artifactsDir) await writeArtifacts(opts.artifactsDir, scenarioNumber, name, result, run);
    return result;
  }
}
async function writeArtifacts(dir, num, name, result, run) {
  await fs.mkdir(dir, { recursive: true });
  const slug = `scenario-${String(num).padStart(2, "0")}-${name.replace(/\s+/g, "-").toLowerCase()}`;
  await fs.writeFile(path.join(dir, `${slug}.json`), JSON.stringify({ result, run }, null, 2));
}
async function writeSummary(dir, results) {
  await fs.mkdir(dir, { recursive: true });
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const lines = [
    `# Phase 1 Scenario Results`,
    ``,
    `Date: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    `Passed: ${passed}/${results.length}  Failed: ${failed}/${results.length}`,
    ``,
    `## Scenarios`,
    ``,
    ...results.map(
      (r) => `- [${r.status === "pass" ? "PASS" : "FAIL"}] Scenario ${r.scenario}: ${r.name}` + (r.error ? `
  Error: ${r.error}` : "") + (r.durationMs ? ` (${r.durationMs}ms)` : "")
    )
  ];
  await fs.writeFile(path.join(dir, "summary.md"), lines.join("\n"));
  await fs.writeFile(path.join(dir, "results.json"), JSON.stringify(results, null, 2));
}
export {
  MockInferenceAdapter,
  runAndAssert,
  runScenario,
  writeSummary
};
