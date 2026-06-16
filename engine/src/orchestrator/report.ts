import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { EngineMetrics, AttemptRecord } from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Report');

export function generateReport(
  metrics: EngineMetrics,
  recentAttempts: AttemptRecord[],
  scoreTrend: number[],
): string {
  const timestamp = new Date().toISOString();
  const avgScore = scoreTrend.length > 0
    ? scoreTrend.reduce((a, b) => a + b, 0) / scoreTrend.length
    : 0;

  const typeStats = new Map<string, { count: number; avgScore: number; passed: number }>();
  for (const attempt of recentAttempts) {
    const stat = typeStats.get(attempt.scenarioType) ?? { count: 0, avgScore: 0, passed: 0 };
    stat.count++;
    stat.avgScore = (stat.avgScore * (stat.count - 1) + attempt.score) / stat.count;
    if (attempt.verification.passed) stat.passed++;
    typeStats.set(attempt.scenarioType, stat);
  }

  const sortedTypes = [...typeStats.entries()].sort((a, b) => b[1].avgScore - a[1].avgScore);
  const bestTypes = sortedTypes.slice(0, 3);
  const worstTypes = sortedTypes.slice(-3).reverse();

  const topBugs = recentAttempts
    .filter(a => !a.verification.passed)
    .slice(0, 5)
    .map(a => {
      const failedCheck = a.verification.checks.find(c => !c.passed);
      return `- [${a.scenarioType}] ${failedCheck?.output.slice(0, 100) ?? 'Unknown failure'}`;
    });

  const scoreImproving = scoreTrend.length >= 10
    ? scoreTrend.slice(-5).reduce((a, b) => a + b, 0) / 5 >
      scoreTrend.slice(0, 5).reduce((a, b) => a + b, 0) / 5
    : null;

  const report = `# Engine Report
Generated: ${timestamp}

## Engine Health Metrics

| Metric | Value |
|--------|-------|
| Total Iterations | ${metrics.iterations} |
| Failures | ${metrics.failures} |
| Avg Cycle Time | ${metrics.avgCycleTime.toFixed(0)}ms |
| Builder Acceptance Rate | ${metrics.builderChangesAttempted > 0 ? ((metrics.builderChangesAccepted / metrics.builderChangesAttempted) * 100).toFixed(1) : 'N/A'}% |
| Regression Rate | ${metrics.builderRegressionRate.toFixed(1)}% |
| Verifier Checks Run | ${metrics.verifierChecksRun} |

## Score Trend (Last 20)

${scoreTrend.slice(-20).map((s, i) => `${i + 1}. ${s.toFixed(0)}`).join('\n') || 'No scores yet'}

Average: ${avgScore.toFixed(1)}/100

## Scenario Type Performance

### Best Performing
${bestTypes.map(([type, stat]) => `- **${type}**: ${stat.avgScore.toFixed(1)} avg score, ${stat.passed}/${stat.count} passed`).join('\n') || 'No data'}

### Worst Performing
${worstTypes.map(([type, stat]) => `- **${type}**: ${stat.avgScore.toFixed(1)} avg score, ${stat.passed}/${stat.count} passed`).join('\n') || 'No data'}

## Top 5 Bugs Found

${topBugs.join('\n') || 'No bugs found yet'}

## Self-Improvement Assessment

${scoreImproving === null
    ? 'Insufficient data to assess improvement trend.'
    : scoreImproving
      ? '**YES** - The engine is measurably improving. Recent scores are higher than earlier scores.'
      : '**NO** - The engine is not improving. Consider adjusting strategies or increasing novelty.'}

Improvement variants tested: ${metrics.improvementVariantsTested}
Win rate: ${(metrics.improvementWinRate * 100).toFixed(1)}%
Gain over baseline: ${metrics.improvementGainOverBaseline.toFixed(1)} points
`;

  return report;
}

export function saveReport(
  metrics: EngineMetrics,
  recentAttempts: AttemptRecord[],
  scoreTrend: number[],
  reportsDir: string,
): string {
  const content = generateReport(metrics, recentAttempts, scoreTrend);
  const timestamp = Date.now();
  
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }
  
  const filePath = join(reportsDir, `report-${timestamp}.md`);
  writeFileSync(filePath, content, 'utf-8');
  logger.info(`Report saved to ${filePath}`);
  return filePath;
}
