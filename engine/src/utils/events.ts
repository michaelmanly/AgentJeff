import { EventEmitter } from 'events';
import { ScenarioType, AttemptRecord, EngineMetrics } from '../types.js';

export type EngineEventType =
  | 'cycle.started'
  | 'cycle.completed'
  | 'objective.chosen'
  | 'proposal.generated'
  | 'critique.done'
  | 'verification.done'
  | 'score.recorded'
  | 'improvement.done'
  | 'worker.result'
  | 'engine.paused'
  | 'engine.stopped'
  | 'engine.started';

export interface EngineEvent {
  id: string;
  type: EngineEventType;
  timestamp: number;
  payload: Record<string, unknown>;
}

export const engineEvents = new EventEmitter();

let eventCounter = 0;
export function emitEngineEvent(type: EngineEventType, payload: Record<string, unknown>) {
  const event: EngineEvent = {
    id: `evt-${++eventCounter}`,
    type,
    timestamp: Date.now(),
    payload,
  };
  engineEvents.emit(type, event);
  engineEvents.emit('*', event);
}
