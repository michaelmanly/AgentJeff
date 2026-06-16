import type { StrategyRecord, AttemptRecord, ScenarioType } from '../types.js';
import type { MemoryManager } from '../memory/index.js';
import { createLogger } from '../utils/logger.js';
import { engineEvents } from '../utils/events.js';

const logger = createLogger('ImprovementLoop');

export class ImprovementLoop {
  constructor(private memory: MemoryManager, private intervalIterations: number) {}

  async runIfDue(currentIteration: number): Promise<void> {
    if (currentIteration % this.intervalIterations !== 0 || currentIteration === 0) return;
    await this.run();
  }

  async run(): Promise<void> {
    logger.info('Running improvement loop');

    const recentAttempts = await this.memory.getRecentAttempts(50);
    if (recentAttempts.length < 5) {
      logger.info('Not enough attempts for improvement analysis');
      return;
    }

    await this.updateStrategyWeights(recentAttempts);
    await this.pruneScenarios(recentAttempts);

    engineEvents.emit('improvement.done', { iterationsReviewed: recentAttempts.length });
    logger.info('Improvement loop complete');
  }

  private async updateStrategyWeights(attempts: AttemptRecord[]): Promise<void> {
    const strategies = await this.memory.getAllStrategies();
    
    const strategyAttempts = new Map<string, AttemptRecord[]>();
    for (const attempt of attempts) {
      const key = attempt.strategy;
      const list = strategyAttempts.get(key) ?? [];
      list.push(attempt);
      strategyAttempts.set(key, list);
    }

    const updatedStrategies: StrategyRecord[] = strategies.map(strategy => {
      const stratAttempts = strategyAttempts.get(strategy.name) ?? [];
      if (stratAttempts.length === 0) return strategy;

      const avgScore = stratAttempts.reduce((sum, a) => sum + a.score, 0) / stratAttempts.length;
      const wins = stratAttempts.filter(a => a.score >= 60).length;
      const winRate = wins / stratAttempts.length;

      const scenarioScores = new Map<ScenarioType, number[]>();
      for (const attempt of stratAttempts) {
        const scores = scenarioScores.get(attempt.scenarioType) ?? [];
        scores.push(attempt.score);
        scenarioScores.set(attempt.scenarioType, scores);
      }

      const updatedWeights = { ...strategy.scenarioWeights };
      for (const [type, scores] of scenarioScores) {
        const typeAvg = scores.reduce((s, v) => s + v, 0) / scores.length;
        const currentWeight = updatedWeights[type] ?? 1.0;
        updatedWeights[type] = currentWeight * 0.8 + (typeAvg / 50) * 0.2;
      }

      return {
        ...strategy,
        avgScore,
        winRate,
        usageCount: strategy.usageCount + stratAttempts.length,
        scenarioWeights: updatedWeights,
        lastUsed: Date.now(),
      };
    });

    await this.memory.saveStrategies(updatedStrategies);
    
    const bestStrategy = updatedStrategies.sort((a, b) => b.avgScore - a.avgScore)[0];
    if (bestStrategy) {
      logger.info(`Best strategy: ${bestStrategy.name} (avg score: ${bestStrategy.avgScore.toFixed(1)})`);
    }
  }

  private async pruneScenarios(attempts: AttemptRecord[]): Promise<void> {
    const typePerformance = new Map<ScenarioType, { total: number; passed: number }>();
    
    for (const attempt of attempts) {
      const perf = typePerformance.get(attempt.scenarioType) ?? { total: 0, passed: 0 };
      perf.total++;
      if (attempt.verification.passed) perf.passed++;
      typePerformance.set(attempt.scenarioType, perf);
    }

    for (const [type, perf] of typePerformance) {
      const successRate = perf.passed / perf.total;
      logger.info(`Scenario type ${type}: ${perf.passed}/${perf.total} passed (${(successRate * 100).toFixed(0)}%)`);
    }
  }
}
