import type { CritiqueResult, VerificationResult, AttemptMetrics } from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Scorer');

export interface ScoringResult {
  score: number;
  breakdown: Record<string, number>;
}

export class Scorer {
  score(
    critique: CritiqueResult,
    verification: VerificationResult,
    previousMetrics?: AttemptMetrics,
    currentMetrics?: AttemptMetrics,
    durationMs?: number,
  ): ScoringResult {
    const breakdown: Record<string, number> = {};
    let score = 0;

    if (verification.passed) {
      breakdown['verification_passed'] = 40;
      score += 40;
    } else {
      breakdown['verification_passed'] = 0;
    }

    if (currentMetrics && previousMetrics) {
      if (currentMetrics.testsPassed >= previousMetrics.testsPassed) {
        breakdown['tests_maintained'] = 20;
        score += 20;
      } else {
        breakdown['tests_maintained'] = 0;
      }
    } else if (currentMetrics && currentMetrics.testsPassed > 0) {
      breakdown['tests_maintained'] = 10;
      score += 10;
    }

    if (critique.approved) {
      breakdown['critic_approved'] = 15;
      score += 15;
    } else {
      breakdown['critic_approved'] = 0;
    }

    const regressions = currentMetrics?.regressions ?? 0;
    if (regressions === 0) {
      breakdown['no_regressions'] = 10;
      score += 10;
    } else {
      breakdown['regressions_penalty'] = -30 * Math.min(regressions, 1);
      score -= 30 * Math.min(regressions, 1);
    }

    if (durationMs !== undefined && durationMs < 30000) {
      breakdown['speed_bonus'] = 5;
      score += 5;
    }

    if (critique.risks.some(r => r.toLowerCase().includes('critical'))) {
      breakdown['critical_risk_penalty'] = -10;
      score -= 10;
    }

    if (currentMetrics?.buildSuccess === false) {
      breakdown['build_failed_penalty'] = -20;
      score -= 20;
    }

    score = Math.max(0, Math.min(100, score));
    breakdown['final'] = score;

    logger.debug(`Score: ${score}`, breakdown);
    return { score, breakdown };
  }

  extractAttemptMetrics(verification: VerificationResult): AttemptMetrics {
    const testsCheck = verification.checks.find(c => c.name === 'tests');
    const tsCheck = verification.checks.find(c => c.name === 'typescript');

    let testsRun = 0, testsPassed = 0, testsFailed = 0;
    if (testsCheck) {
      const runMatch = testsCheck.output.match(/(\d+) total/);
      const passMatch = testsCheck.output.match(/(\d+) passed/);
      const failMatch = testsCheck.output.match(/(\d+) failed/);
      testsRun = runMatch ? parseInt(runMatch[1], 10) : 0;
      testsPassed = passMatch ? parseInt(passMatch[1], 10) : 0;
      testsFailed = failMatch ? parseInt(failMatch[1], 10) : 0;
    }

    const lintErrors = tsCheck
      ? (tsCheck.output.match(/error TS\d+/g) ?? []).length
      : 0;

    return {
      testsRun,
      testsPassed,
      testsFailed,
      lintErrors,
      buildSuccess: tsCheck?.passed ?? true,
      regressions: testsFailed > 0 ? 1 : 0,
    };
  }
}
