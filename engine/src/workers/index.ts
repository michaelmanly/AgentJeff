import type { ScenarioType } from '../types.js';
import { runWorkerCycle, type WorkerConfig, type WorkerResult } from './worker.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WorkerPool');

const SCENARIO_ROTATION: ScenarioType[] = [
  'edge-case',
  'missing-test',
  'adversarial-review',
  'regression',
  'flaky-test',
];

export class WorkerPool {
  private workerCount: number;
  private model: string;
  private baseUrl: string;
  private repoPath: string;

  constructor(opts: {
    workerCount?: number;
    model?: string;
    baseUrl?: string;
    repoPath?: string;
  } = {}) {
    this.workerCount = opts.workerCount ?? 3;
    this.model = opts.model ?? 'qwen2.5-coder:7b';
    this.baseUrl = opts.baseUrl ?? 'http://localhost:11434';
    this.repoPath = opts.repoPath ?? '.';
  }

  async runCycle(): Promise<WorkerResult[]> {
    logger.info(`Running worker pool with ${this.workerCount} workers`);
    
    const configs: WorkerConfig[] = Array.from({ length: this.workerCount }, (_, i) => ({
      workerId: `worker-${i + 1}`,
      scenarioType: SCENARIO_ROTATION[i % SCENARIO_ROTATION.length],
      model: this.model,
      baseUrl: this.baseUrl,
      repoPath: this.repoPath,
    }));

    const results = await Promise.allSettled(
      configs.map(config => runWorkerCycle(config))
    );

    return results.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      logger.error(`Worker ${configs[i]!.workerId} rejected`, result.reason);
      return {
        workerId: configs[i]!.workerId,
        scenarioType: configs[i]!.scenarioType,
        attempt: null,
        error: String(result.reason),
      };
    });
  }
}
