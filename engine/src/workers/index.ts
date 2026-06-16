import { InferenceAdapter, ScenarioType } from '../types.js';
import { ScenarioWorker, WorkerResult } from './worker.js';
import { RepoAdapter } from '../adapters/repo/index.js';
import { Verifier } from '../verifier/index.js';
import { Scorer } from '../scorer/index.js';
import { MemoryManager } from '../memory/index.js';
import { emitEngineEvent } from '../utils/events.js';
import { logger } from '../utils/logger.js';

const SCENARIO_ROTATION: ScenarioType[] = [
  'edge-case',
  'missing-test',
  'regression',
  'adversarial-review',
  'performance',
];

export class WorkerPool {
  private workers: ScenarioWorker[];
  private cycleCount = 0;

  constructor(
    adapter: InferenceAdapter,
    repo: RepoAdapter,
    verifier: Verifier,
    scorer: Scorer,
    memory: MemoryManager,
    poolSize: number
  ) {
    this.workers = Array.from({ length: poolSize }, (_, i) => new ScenarioWorker(i, adapter, repo, verifier, scorer, memory));
  }

  async runOnce(): Promise<WorkerResult[]> {
    const offset = this.cycleCount % SCENARIO_ROTATION.length;
    const assignments: ScenarioType[] = this.workers.map(
      (_, i) => SCENARIO_ROTATION[(offset + i) % SCENARIO_ROTATION.length]
    );
    this.cycleCount++;

    const results = await Promise.allSettled(
      this.workers.map((w, i) => w.runOnce(assignments[i]))
    );

    const outcomes: WorkerResult[] = results
      .filter((r): r is PromiseFulfilledResult<WorkerResult> => r.status === 'fulfilled')
      .map((r) => r.value);

    const avgScore = outcomes.length
      ? outcomes.reduce((s, r) => s + r.score, 0) / outcomes.length
      : 0;

    emitEngineEvent('worker.result', {
      workers: outcomes.length,
      avgScore: avgScore.toFixed(1),
      passed: outcomes.filter((r) => r.passed).length,
    });

    logger.debug(`Workers done: ${outcomes.length} results, avgScore=${avgScore.toFixed(1)}`);
    return outcomes;
  }
}
