export interface AgentState {
  currentStep: string;
  intermediateValues: Record<string, unknown>;
  toolOutputs: Record<string, unknown>;
  errors: Array<{ step: string; message: string }>;
  checkpointData: Record<string, unknown>;
}

export function initialState(): AgentState {
  return {
    currentStep: 'start',
    intermediateValues: {},
    toolOutputs: {},
    errors: [],
    checkpointData: {},
  };
}
