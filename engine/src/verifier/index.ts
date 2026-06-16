import { Proposal, VerificationResult, CheckResult } from '../types.js';
import { TestRunnerAdapter } from '../adapters/tests/index.js';
import { checkBuild, checkTests, checkForbiddenPatterns, checkDiffSize, checkNoRegression } from './checks.js';
import { logger } from '../utils/logger.js';

export class Verifier {
  private baselineTests: { passed: number; total: number } | null = null;

  constructor(private testRunner: TestRunnerAdapter, private repoPath: string) {}

  async setBaseline(): Promise<void> {
    const result = await this.testRunner.runTests();
    this.baselineTests = { passed: result.passed, total: result.total };
    logger.info('Verifier baseline set', this.baselineTests);
  }

  async verify(proposal: Proposal): Promise<VerificationResult> {
    const start = Date.now();
    const checks: CheckResult[] = [];

    // Static checks (fast, no I/O)
    checks.push(checkForbiddenPatterns(proposal));
    checks.push(checkDiffSize(proposal));

    // Dynamic checks only if there are changes
    if (proposal.changes.length > 0) {
      try {
        const buildCheck = await checkBuild(this.testRunner, this.repoPath);
        checks.push(buildCheck);

        if (buildCheck.passed) {
          const testCheck = await checkTests(this.testRunner);
          checks.push(testCheck);

          if (this.baselineTests) {
            const regressionCheck = await checkNoRegression(this.testRunner, this.baselineTests);
            checks.push(regressionCheck);
          }
        }
      } catch (err) {
        logger.warn('Verification check error', err);
        checks.push({
          name: 'verification-error',
          passed: false,
          output: String(err),
          duration: 0,
        });
      }
    }

    const passed = checks.every((c) => c.passed);

    return {
      proposalId: proposal.id,
      passed,
      checks,
      duration: Date.now() - start,
    };
  }
}
