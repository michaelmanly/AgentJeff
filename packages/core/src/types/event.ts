export type EventType =
  | 'run.started'
  | 'run.completed'
  | 'run.failed'
  | 'run.interrupted'
  | 'checkpoint.created'
  | 'tool.called'
  | 'tool.succeeded'
  | 'tool.failed'
  | 'state.updated';

export interface AgentEvent {
  id: string;
  type: EventType;
  runId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}
