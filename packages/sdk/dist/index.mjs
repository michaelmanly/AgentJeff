// src/define.ts
function defineAgent(def) {
  return def;
}
function defineTool(def) {
  return def;
}

// src/index.ts
import { executeRun as executeRun2 } from "@newatom/runtime";
import { BadgrAdapter as BadgrAdapter2, LocalWorkspaceAdapter } from "@newatom/adapters";
export * from "@newatom/core";

// src/run.ts
import { executeRun } from "@newatom/runtime";
import { BadgrAdapter } from "@newatom/adapters";
async function run(agent, input, opts = {}) {
  const adapter = opts.adapter ?? new BadgrAdapter();
  return executeRun({
    agent,
    input,
    inferenceAdapter: adapter,
    onEvent: opts.onEvent,
    checkpointSaver: opts.checkpointSaver
  });
}
export {
  BadgrAdapter2 as BadgrAdapter,
  LocalWorkspaceAdapter,
  defineAgent,
  defineTool,
  executeRun2 as executeRun,
  run
};
