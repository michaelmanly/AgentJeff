import type { Proposal, VerificationResult } from '../types.js';
import { checkTypeScript, checkTests, checkDiffSize, checkForbiddenPatterns } from './checks.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Verifier');

const FORBIDDEN_PATTERNS = ['rm -rf', 'eval(', 'DROP TABLE', 'DELETE FROM'];

export class Verifier {
  constructor(private repoPath: string) {}

  async verify(proposal: Proposal): Promise<VerificationResult> {
    const start = Date.now();
    logger.info(`Verifying proposal ${proposal.id}`);

    if (proposal.changes.length === 0) {
      return {
        proposalId: proposal.id,
        passed: true,
        checks: [{ name: 'no-changes', passed: true, output: 'No changes to verify', duration: 0 }],
        duration: 0,
      };
    }

    const checks = await Promise.all([
      checkForbiddenPatterns(proposal, FORBIDDEN_PATTERNS),
      checkDiffSize(proposal),
      checkTypeScript(this.repoPath),
      checkTests(this.repoPath),
    ]);

    const passed = checks.every(c => c.passed);
    const duration = Date.now() - start;

    logger.info(`Verification ${passed ? 'PASSED' : 'FAILED'} for ${proposal.id}`, {
      checks: checks.map(c => ({ name: c.name, passed: c.passed })),
    });

    return { proposalId: proposal.id, passed, checks, duration };
  }
}
