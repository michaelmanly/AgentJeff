import { join } from 'path';
import type { AttemptRecord, StrategyRecord, ScenarioRecord, ScenarioType } from '../types.js';
import { MemoryStore } from './store.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MemoryManager');

const DEFAULT_STRATEGIES: StrategyRecord[] = [
  {
    id: 'balanced',
    name: 'balanced',
    description: 'Balanced approach across all scenario types',
    promptStyle: 'analytical',
    scenarioWeights: {
      'edge-case': 1.0,
      'regression': 1.0,
      'performance': 0.8,
      'flaky-test': 0.8,
      'adversarial-review': 0.9,
      'missing-test': 1.0,
      'unsafe-change': 0.7,
      'benchmark-degradation': 0.6,
    },
    avgScore: 50,
    usageCount: 0,
    winRate: 0,
    lastUsed: 0,
  },
  {
    id: 'bug-focused',
    name: 'bug-focused',
    description: 'Focus on finding and fixing bugs',
    promptStyle: 'critical',
    scenarioWeights: {
      'edge-case': 1.5,
      'regression': 1.5,
      'performance': 0.5,
      'flaky-test': 1.0,
      'adversarial-review': 1.2,
      'missing-test': 1.3,
      'unsafe-change': 1.0,
      'benchmark-degradation': 0.4,
    },
    avgScore: 50,
    usageCount: 0,
    winRate: 0,
    lastUsed: 0,
  },
];

export class MemoryManager {
  private store: MemoryStore;

  constructor(memoryDir: string) {
    this.store = new MemoryStore(
      join(memoryDir, 'attempts.jsonl'),
      join(memoryDir, 'strategies.json'),
      join(memoryDir, 'scenarios.json'),
      join(memoryDir, 'scores.json'),
    );
  }

  async saveAttempt(attempt: AttemptRecord): Promise<void> {
    await this.store.appendAttempt(attempt);
    await this.store.appendScore(attempt.score);
    logger.info(`Saved attempt ${attempt.id} with score ${attempt.score}`);
  }

  async getRecentAttempts(n: number): Promise<AttemptRecord[]> {
    return this.store.readAttempts(n);
  }

  async getBestStrategy(): Promise<StrategyRecord | null> {
    let strategies = await this.store.loadStrategies();
    if (strategies.length === 0) {
      await this.store.saveStrategies(DEFAULT_STRATEGIES);
      strategies = DEFAULT_STRATEGIES;
    }
    const sorted = [...strategies].sort((a, b) => b.avgScore - a.avgScore);
    return sorted[0] ?? null;
  }

  async updateStrategy(strategy: StrategyRecord): Promise<void> {
    const strategies = await this.store.loadStrategies();
    const idx = strategies.findIndex(s => s.id === strategy.id);
    if (idx >= 0) {
      strategies[idx] = strategy;
    } else {
      strategies.push(strategy);
    }
    await this.store.saveStrategies(strategies);
  }

  async getScoreTrend(): Promise<number[]> {
    const scores = await this.store.loadScores();
    return scores.slice(-20);
  }

  async getRepeatedMistakes(): Promise<string[]> {
    const attempts = await this.store.readAttempts(50);
    const failedAttempts = attempts.filter(a => !a.verification.passed);
    const patternCounts: Record<string, number> = {};
    
    for (const attempt of failedAttempts) {
      for (const check of attempt.verification.checks) {
        if (!check.passed) {
          const key = `${check.name}: ${check.output.slice(0, 100)}`;
          patternCounts[key] = (patternCounts[key] ?? 0) + 1;
        }
      }
    }
    
    return Object.entries(patternCounts)
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([pattern, count]) => `${pattern} (${count}x)`);
  }

  async getAllStrategies(): Promise<StrategyRecord[]> {
    const strategies = await this.store.loadStrategies();
    if (strategies.length === 0) {
      await this.store.saveStrategies(DEFAULT_STRATEGIES);
      return DEFAULT_STRATEGIES;
    }
    return strategies;
  }

  async saveStrategies(strategies: StrategyRecord[]): Promise<void> {
    await this.store.saveStrategies(strategies);
  }

  async getScenarios(): Promise<ScenarioRecord[]> {
    return this.store.loadScenarios();
  }

  async saveScenario(scenario: ScenarioRecord): Promise<void> {
    const scenarios = await this.store.loadScenarios();
    scenarios.push(scenario);
    await this.store.saveScenarios(scenarios);
  }
}
