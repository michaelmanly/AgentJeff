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
  | 'engine.stopped';

export interface EngineEvent {
  type: EngineEventType;
  data: unknown;
  timestamp: number;
}

type EventHandler = (event: EngineEvent) => void;

export class EngineEventEmitter {
  private handlers: Map<EngineEventType, EventHandler[]> = new Map();

  on(type: EngineEventType, handler: EventHandler): void {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(type, [...existing, handler]);
  }

  off(type: EngineEventType, handler: EventHandler): void {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(type, existing.filter(h => h !== handler));
  }

  emit(type: EngineEventType, data: unknown): void {
    const event: EngineEvent = { type, data, timestamp: Date.now() };
    const handlers = this.handlers.get(type) ?? [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch {
        // ignore handler errors
      }
    }
  }
}

export const engineEvents = new EngineEventEmitter();
