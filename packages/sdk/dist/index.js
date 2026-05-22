"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BadgrAdapter: () => import_adapters2.BadgrAdapter,
  LocalWorkspaceAdapter: () => import_adapters2.LocalWorkspaceAdapter,
  defineAgent: () => defineAgent,
  defineTool: () => defineTool,
  executeRun: () => import_runtime2.executeRun,
  run: () => run
});
module.exports = __toCommonJS(index_exports);

// src/define.ts
function defineAgent(def) {
  return def;
}
function defineTool(def) {
  return def;
}

// src/index.ts
var import_runtime2 = require("@newatom/runtime");
var import_adapters2 = require("@newatom/adapters");
__reExport(index_exports, require("@newatom/core"), module.exports);

// src/run.ts
var import_runtime = require("@newatom/runtime");
var import_adapters = require("@newatom/adapters");
async function run(agent, input, opts = {}) {
  const adapter = opts.adapter ?? new import_adapters.BadgrAdapter();
  return (0, import_runtime.executeRun)({
    agent,
    input,
    inferenceAdapter: adapter,
    onEvent: opts.onEvent,
    checkpointSaver: opts.checkpointSaver
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BadgrAdapter,
  LocalWorkspaceAdapter,
  defineAgent,
  defineTool,
  executeRun,
  run,
  ...require("@newatom/core")
});
