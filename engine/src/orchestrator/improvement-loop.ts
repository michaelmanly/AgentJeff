import { MemoryManager } from '../memory/index.js';
import { StrategyRecord, ScenarioType } from '../types.js';
import { emitEngineEvent } from '../utils/events.js';
import { logger } from '../utils/logger.js';

const ALL_SCENARIO_TYPES: ScenarioType[] = [
  'edge-case', 'regression', 'performance', 'flaky-test',
  'adversarial-review', 'missing-test', 'unsafe-change', 'benchmark-degradation',
];

export async function runImprovementCycle(memory: MemoryManager): Promise<void> {
  logger.info('Running improvement loop...');

  const attempts = await memory.getRecentAttempts(100);
  if (attempts.length < 5) {
    logger.info('Not enough data for improvement yet');
    return;
  }

  // Compute per-scenario-type score averages
  const typeScores = new Map<ScenarioType, number[]>();
  for (const attempt of attempts) {
    const scores = typeScores.get(attempt.scenarioType) ?? [];
    scores.push(attempt.score);
    typeScores.set(attempt.scenarioType, scores);
  }

  const typeAvgs = new Map<ScenarioType, number>();
  for (const [type, scores] of typeScores) {
    typeAvgs.set(type, scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  logger.info('Scenario type averages', Object.fromEntries(typeAvgs));

  // Update strategy weights: bias toward high-scoring types
  const strategies = await memory.getAllStrategies();
  let updated = false;

  for (const strategy of strategies) {
    const newWeights = { ...strategy.scenarioWeights };
    let changed = false;

    for (const type of ALL_SCENARIO_TYPES) {
      const avg = typeAvgs.get(type);
      if (avg === undefined) continue;

      const current = newWeights[type] ?? 1;
      if (avg > 60 && current < 4) {
        newWeights[type] = Math.min(4, current + 1);
        changed = true;
        logger.info(`Increased weight for ${type}: ${current} -> ${newWeights[type]}`);
      } else if (avg < 20 && current > 1) {
        newWeights[type] = Math.max(1, current - 1);
        changed = true;
        logger.info(`Decreased weight for ${type}: ${current} -> ${newWeights[type]}`);
      }
    }

    if (changed) {
      const strategyAttempts = attempts.filter((a) => a.strategy === strategy.name);
      const strategyAvg = strategyAttempts.length
        ? strategyAttempts.reduce((sum, a) => sum + a.score, 0) / strategyAttempts.length
        : 0;

      await memory.updateStrategy({
        ...strategy,
        scenarioWeights: newWeights as Record<ScenarioType, number>,
        avgScore: strategyAvg,
        usageCount: strategy.usageCount + strategyAttempts.length,
        winRate: strategyAttempts.filter((a) => a.score > 50).length / Math.max(1, strategyAttempts.length),
        lastUsed: Date.now(),
      });
      updated = true;
    }
  }

  // Compare strategies
  const allStrategies = await memory.getAllStrategies();
  if (allStrategies.length >= 2) {
    const sorted = allStrategies.sort((a, b) => b.avgScore - a.avgScore);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const gain = best.avgScore - worst.avgScore;

    logger.info(`Best strategy: ${best.name} (avg: ${best.avgScore.toFixed(1)}) vs worst: ${worst.name} (avg: ${worst.avgScore.toFixed(1)}) | Gain: ${gain.toFixed(1)}`);
  }

  // Find repeated mistakes
  const mistakes = await memory.getRepeatedMistakes();
  if (mistakes.length) {
    logger.warn('Repeated failures detected', mistakes);
  }

  emitEngineEvent('improvement.done', {
    strategiesUpdated: updated,
    typeAverages: Object.fromEntries(typeAvgs),
    mistakes,
  });
}
