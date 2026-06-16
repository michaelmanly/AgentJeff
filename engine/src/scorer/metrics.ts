import { EngineMetrics } from '../types.js';

export function emptyMetrics(): EngineMetrics {
  return {
    iterations: 0,
    failures: 0,
    avgCycleTimeMs: 0,
    scoreTrend: [],
    repeatedMistakes: 0,
    builderChangesAttempted: 0,
    builderChangesAccepted: 0,
    builderChangesReverted: 0,
    builderRegressionRate: 0,
    criticCorrectWarnings: 0,
    criticMisses: 0,
    criticFalseAlarms: 0,
    scenarioNovelty: 0,
    scenarioIssueDiscoveryRate: 0,
    scenarioDuplicateRate: 0,
    verifierChecksRun: 0,
    verifierFailureCatchRate: 0,
    verifierNoisyFailures: 0,
    improvementVariantsTested: 0,
    improvementWinRate: 0,
    improvementGainOverBaseline: 0,
  };
}

export function updateMetrics(metrics: EngineMetrics, cycleMs: number): EngineMetrics {
  const n = metrics.iterations;
  const newAvg = n === 0 ? cycleMs : (metrics.avgCycleTimeMs * n + cycleMs) / (n + 1);
  return { ...metrics, avgCycleTimeMs: newAvg };
}
