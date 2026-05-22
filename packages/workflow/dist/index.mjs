// src/workflow.ts
var Workflow = class {
  steps = [];
  _name;
  constructor(name) {
    this._name = name;
  }
  step(name, fn) {
    this.steps.push({ name, fn });
    return this;
  }
  async run(initialState, ctx) {
    let state = { ...initialState };
    for (const step of this.steps) {
      const patch = await step.fn(state, ctx);
      state = { ...state, ...patch };
    }
    return state;
  }
};
function createWorkflow(name) {
  return new Workflow(name);
}
export {
  Workflow,
  createWorkflow
};
