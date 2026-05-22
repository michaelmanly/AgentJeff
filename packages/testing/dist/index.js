"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  MockInferenceAdapter: () => MockInferenceAdapter,
  runAndAssert: () => runAndAssert,
  runScenario: () => runScenario,
  writeSummary: () => writeSummary
});
module.exports = __toCommonJS(index_exports);

// src/harness.ts
var import_runtime = require("@newatom/runtime");
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
  const run = await (0, import_runtime.executeRun)({ agent, input, inferenceAdapter: adapter });
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
var import_promises = __toESM(require("fs/promises"));
var import_path = __toESM(require("path"));
var import_runtime2 = require("@newatom/runtime");
async function runScenario(scenarioNumber, name, opts) {
  const start = Date.now();
  let run;
  try {
    run = await (0, import_runtime2.executeRun)({
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
  await import_promises.default.mkdir(dir, { recursive: true });
  const slug = `scenario-${String(num).padStart(2, "0")}-${name.replace(/\s+/g, "-").toLowerCase()}`;
  await import_promises.default.writeFile(import_path.default.join(dir, `${slug}.json`), JSON.stringify({ result, run }, null, 2));
}
async function writeSummary(dir, results) {
  await import_promises.default.mkdir(dir, { recursive: true });
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
  await import_promises.default.writeFile(import_path.default.join(dir, "summary.md"), lines.join("\n"));
  await import_promises.default.writeFile(import_path.default.join(dir, "results.json"), JSON.stringify(results, null, 2));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MockInferenceAdapter,
  runAndAssert,
  runScenario,
  writeSummary
});
