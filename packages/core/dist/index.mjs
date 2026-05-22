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
import { randomUUID } from "crypto";
var newId = () => randomUUID();
export {
  definePack,
  initialState,
  newId
};
