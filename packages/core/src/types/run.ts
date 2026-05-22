import { AgentEvent } from './event';
import { AgentState } from './state';

export type RunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'interrupted';

export interface Run {
  id: string;
  agentName: string;
  input: unknown;
  state: AgentState;
  status: RunStatus;
  startedAt: number;
  completedAt?: number;
  result?: unknown;
  error?: string;
  events: AgentEvent[];
}
