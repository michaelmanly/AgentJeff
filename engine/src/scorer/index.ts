import { CritiqueResult, VerificationResult, AttemptMetrics } from '../types.js';
import { logger } from '../utils/logger.js';

export interface ScoreBreakdown {
  total: number;
  verificationPassed: number;
  testsImproved: number;
  criticApproved: number;
  noRegressions: number;
  speed: number;
  deductions: number;
  details: string[];
}

export class Scorer {
  score(
    critique: CritiqueResult,
    verification: VerificationResult,
    metrics: AttemptMetrics,
    cycleMs: number
  ): number {
    const breakdown = this.breakdown(critique, verification, metrics, cycleMs);
    logger.debug('Score breakdown', { total: breakdown.total, details: breakdown.details });
    return Math.max(0, Math.min(100, breakdown.total));
  }

  breakdown(
    critique: CritiqueResult,
    verification: VerificationResult,
    metrics: AttemptMetrics,
    cycleMs: number
  ): ScoreBreakdown {
    let total = 0;
    const details: string[] = [];

    // +40: verification passed
    const verificationPassed = verification.passed ? 40 : 0;
    if (verificationPassed) details.push('+40 verification passed');
    total += verificationPassed;

    // +20: tests improved or maintained
    const testsImproved = metrics.testsFailed === 0 && metrics.testsRun > 0 ? 20 : 0;
    if (testsImproved) details.push('+20 all tests passing');
    total += testsImproved;

    // +15: critic approved
    const criticApproved = critique.approved ? 15 : 0;
    if (criticApproved) details.push('+15 critic approved');
    total += criticApproved;

    // +10: no regressions
    const noRegressions = metrics.regressions === 0 ? 10 : 0;
    if (noRegressions) details.push('+10 no regressions');
    total += noRegressions;

    // +5: speed bonus (< 10s cycle)
    const speed = cycleMs < 10000 ? 5 : cycleMs < 30000 ? 2 : 0;
    if (speed) details.push(`+${speed} speed bonus`);
    total += speed;

    // Deductions
    let deductions = 0;
    if (metrics.regressions > 0) {
      deductions += 30;
      details.push('-30 regressions found');
    }
    if (critique.risks.some((r) => r.includes('Forbidden'))) {
      deductions += 10;
      details.push('-10 forbidden patterns');
    }
    if (critique.warnings.length > 3) {
      deductions += 5;
      details.push('-5 many warnings');
    }
    if (!verification.passed && metrics.lintErrors > 0) {
      deductions += 10;
      details.push('-10 lint errors');
    }

    total -= deductions;

    return { total, verificationPassed, testsImproved, criticApproved, noRegressions, speed, deductions, details };
  }

  extractMetrics(verification: VerificationResult): AttemptMetrics {
    const testCheck = verification.checks.find((c) => c.name === 'unit-tests');
    const buildCheck = verification.checks.find((c) => c.name === 'typescript-build');
    const regressionCheck = verification.checks.find((c) => c.name === 'regression-check');

    let passed = 0, failed = 0, total = 0;
    if (testCheck) {
      const passedMatch = testCheck.output.match(/(\d+) passed/);
      const failedMatch = testCheck.output.match(/(\d+) failed/);
      passed = parseInt(passedMatch?.[1] ?? '0');
      failed = parseInt(failedMatch?.[1] ?? '0');
      total = passed + failed;
    }

    const lintErrors = buildCheck && !buildCheck.passed
      ? (buildCheck.output.match(/error TS\d+/g) ?? []).length
      : 0;

    const regressions = regressionCheck && !regressionCheck.passed ? 1 : 0;

    return {
      testsRun: total,
      testsPassed: passed,
      testsFailed: failed,
      lintErrors,
      buildSuccess: buildCheck?.passed ?? false,
      regressions,
    };
  }
}
