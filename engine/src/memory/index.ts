import {
  AttemptRecord,
  StrategyRecord,
  ScenarioRecord,
  ScenarioType,
  EngineMetrics,
} from '../types.js';
import * as store from './store.js';
import { logger } from '../utils/logger.js';

export class MemoryManager {
  async saveAttempt(attempt: AttemptRecord): Promise<void> {
    await store.appendAttempt(attempt);
    await store.appendScore(attempt.score);
  }

  async getRecentAttempts(n = 50): Promise<AttemptRecord[]> {
    return store.readAttempts(n);
  }

  async getBestStrategy(): Promise<StrategyRecord | null> {
    const strategies = await store.loadStrategies();
    if (!strategies.length) return null;
    return strategies.sort((a, b) => b.avgScore - a.avgScore)[0];
  }

  async updateStrategy(strategy: StrategyRecord): Promise<void> {
    const strategies = await store.loadStrategies();
    const idx = strategies.findIndex((s) => s.id === strategy.id);
    if (idx >= 0) {
      strategies[idx] = strategy;
    } else {
      strategies.push(strategy);
    }
    await store.saveStrategies(strategies);
  }

  async getAllStrategies(): Promise<StrategyRecord[]> {
    return store.loadStrategies();
  }

  async getScoreTrend(n = 20): Promise<number[]> {
    const scores = await store.loadScores();
    return scores.slice(-n);
  }

  async getRepeatedMistakes(): Promise<string[]> {
    const attempts = await store.readAttempts(100);
    const failed = attempts.filter((a) => !a.verification.passed);
    const errorMap = new Map<string, number>();

    for (const attempt of failed) {
      for (const check of attempt.verification.checks) {
        if (!check.passed) {
          const key = check.name;
          errorMap.set(key, (errorMap.get(key) ?? 0) + 1);
        }
      }
    }

    return Array.from(errorMap.entries())
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => `${name} (${count}x)`);
  }

  async computeMetrics(): Promise<Partial<EngineMetrics>> {
    const attempts = await store.readAttempts(200);
    const scores = await store.loadScores();

    if (!attempts.length) return {};

    const accepted = attempts.filter((a) => a.verification.passed);
    const reverted = attempts.filter((a) => !a.verification.passed);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const criticWarnings = attempts.filter(
      (a) => a.critique.warnings.length > 0 && !a.verification.passed
    ).length;
    const criticMisses = attempts.filter(
      (a) => a.critique.approved && !a.verification.passed
    ).length;

    const scenarioTypes = new Set(attempts.map((a) => a.scenarioType));
    const novelty = scenarioTypes.size / 8; // 8 scenario types total

    return {
      iterations: attempts.length,
      failures: reverted.length,
      scoreTrend: scores.slice(-20),
      builderChangesAttempted: attempts.length,
      builderChangesAccepted: accepted.length,
      builderChangesReverted: reverted.length,
      builderRegressionRate: attempts.length > 0 ? reverted.length / attempts.length : 0,
      criticCorrectWarnings: criticWarnings,
      criticMisses,
      scenarioNovelty: novelty,
      verifierChecksRun: attempts.reduce((sum, a) => sum + a.verification.checks.length, 0),
    };
  }

  async initDefaultStrategies(): Promise<void> {
    const existing = await store.loadStrategies();
    if (existing.length > 0) return;

    const defaultWeights: Record<ScenarioType, number> = {
      'edge-case': 2,
      'regression': 2,
      'performance': 1,
      'flaky-test': 1,
      'adversarial-review': 1,
      'missing-test': 2,
      'unsafe-change': 1,
      'benchmark-degradation': 1,
    };

    const strategies: StrategyRecord[] = [
      {
        id: 'strategy-balanced',
        name: 'balanced',
        description: 'Equal weight across all scenario types',
        promptStyle: 'detailed',
        scenarioWeights: defaultWeights,
        avgScore: 0,
        usageCount: 0,
        winRate: 0,
        lastUsed: 0,
      },
      {
        id: 'strategy-aggressive',
        name: 'aggressive',
        description: 'Focus on edge cases and regressions',
        promptStyle: 'concise',
        scenarioWeights: { ...defaultWeights, 'edge-case': 4, 'regression': 4 },
        avgScore: 0,
        usageCount: 0,
        winRate: 0,
        lastUsed: 0,
      },
    ];

    await store.saveStrategies(strategies);
    logger.info('Initialized default strategies');
  }
}
