import fs from 'fs/promises';
import path from 'path';
import { EngineMetrics, StrategyRecord } from '../types.js';
import { MemoryManager } from '../memory/index.js';
import { logger } from '../utils/logger.js';

export async function generateReport(memory: MemoryManager, metrics: EngineMetrics): Promise<string> {
  const [attempts, strategies, scoreTrend, mistakes] = await Promise.all([
    memory.getRecentAttempts(50),
    memory.getAllStrategies(),
    memory.getScoreTrend(20),
    memory.getRepeatedMistakes(),
  ]);

  const avgScore = scoreTrend.length
    ? (scoreTrend.reduce((a, b) => a + b, 0) / scoreTrend.length).toFixed(1)
    : 'N/A';

  const trend48h = (() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const old = attempts.filter((a) => a.timestamp < cutoff);
    const recent = attempts.filter((a) => a.timestamp >= cutoff);
    if (!old.length || !recent.length) return 'Not enough data';
    const oldAvg = old.reduce((s, a) => s + a.score, 0) / old.length;
    const newAvg = recent.reduce((s, a) => s + a.score, 0) / recent.length;
    const diff = newAvg - oldAvg;
    return diff > 0
      ? `YES — avg score improved by ${diff.toFixed(1)} points (+${((diff / oldAvg) * 100).toFixed(0)}%)`
      : `NO — avg score decreased by ${Math.abs(diff).toFixed(1)} points`;
  })();

  const typeBreakdown = (() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const a of attempts) {
      const cur = map.get(a.scenarioType) ?? { total: 0, count: 0 };
      map.set(a.scenarioType, { total: cur.total + a.score, count: cur.count + 1 });
    }
    return Array.from(map.entries())
      .map(([type, { total, count }]) => `| ${type} | ${count} | ${(total / count).toFixed(1)} |`)
      .join('\n');
  })();

  const report = `# Engine Report — ${new Date().toISOString()}

## Key Question: Is the engine measurably better than it was 48 hours ago?
**${trend48h}**

## Engine Health
| Metric | Value |
|--------|-------|
| Total Iterations | ${metrics.iterations} |
| Failures | ${metrics.failures} |
| Avg Cycle Time | ${(metrics.avgCycleTimeMs / 1000).toFixed(1)}s |
| Avg Score (last 20) | ${avgScore} |
| Repeated Mistakes | ${mistakes.length} |

## Score Trend (last 20)
\`${scoreTrend.map((s) => s.toFixed(0)).join(', ')}\`

## Builder Quality
| Metric | Value |
|--------|-------|
| Changes Attempted | ${metrics.builderChangesAttempted} |
| Changes Accepted | ${metrics.builderChangesAccepted} |
| Changes Reverted | ${metrics.builderChangesReverted} |
| Regression Rate | ${(metrics.builderRegressionRate * 100).toFixed(1)}% |

## Verifier Quality
| Metric | Value |
|--------|-------|
| Checks Run | ${metrics.verifierChecksRun} |
| Failure Catch Rate | ${(metrics.verifierFailureCatchRate * 100).toFixed(1)}% |

## Scenario Breakdown
| Type | Attempts | Avg Score |
|------|----------|-----------|
${typeBreakdown || '| (no data) | - | - |'}

## Strategies
${strategies.map((s) => `- **${s.name}**: avg=${s.avgScore.toFixed(1)}, uses=${s.usageCount}, winRate=${(s.winRate * 100).toFixed(0)}%`).join('\n') || '- (none)'}

## Repeated Mistakes
${mistakes.length ? mistakes.map((m) => `- ${m}`).join('\n') : '- None detected'}
`;

  const reportDir = path.join(process.cwd(), 'artifacts', 'reports');
  await fs.mkdir(reportDir, { recursive: true });
  const filename = path.join(reportDir, `report-${Date.now()}.md`);
  await fs.writeFile(filename, report, 'utf-8');
  logger.info(`Report saved: ${filename}`);

  return report;
}
