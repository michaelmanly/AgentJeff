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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  definePack: () => definePack,
  initialState: () => initialState,
  newId: () => newId
});
module.exports = __toCommonJS(index_exports);

// src/types/state.ts
function initialState() {
  return {
    currentStep: "start",
    intermediateValues: {},
    toolOutputs: {},
    errors: [],
    checkpointData: {}
  };
}

// src/types/pack.ts
function definePack(pack) {
  return pack;
}

// src/utils/id.ts
var import_crypto = require("crypto");
var newId = () => (0, import_crypto.randomUUID)();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  definePack,
  initialState,
  newId
});
