import { CheckResult, Proposal } from '../types.js';
import { TestRunnerAdapter } from '../adapters/tests/index.js';

export async function checkBuild(testRunner: TestRunnerAdapter, repoPath: string): Promise<CheckResult> {
  const start = Date.now();
  const result = await testRunner.runLint(repoPath);
  return {
    name: 'typescript-build',
    passed: result.errors === 0,
    output: result.output.slice(0, 500),
    duration: Date.now() - start,
  };
}

export async function checkTests(testRunner: TestRunnerAdapter): Promise<CheckResult> {
  const start = Date.now();
  const result = await testRunner.runTests();
  return {
    name: 'unit-tests',
    passed: result.failed === 0 && result.total > 0,
    output: `${result.passed} passed, ${result.failed} failed of ${result.total} total\n${result.output.slice(0, 500)}`,
    duration: Date.now() - start,
  };
}

export function checkForbiddenPatterns(proposal: Proposal): CheckResult {
  const FORBIDDEN = ['rm -rf', 'eval(', 'exec(', 'DROP TABLE', '__proto__'];
  const found: string[] = [];

  for (const change of proposal.changes) {
    for (const pattern of FORBIDDEN) {
      if (change.content.includes(pattern)) {
        found.push(`${pattern} in ${change.path}`);
      }
    }
  }

  return {
    name: 'forbidden-patterns',
    passed: found.length === 0,
    output: found.length ? `Found forbidden patterns: ${found.join(', ')}` : 'No forbidden patterns',
    duration: 0,
  };
}

export function checkDiffSize(proposal: Proposal): CheckResult {
  const totalLines = proposal.changes.reduce((sum, c) => sum + c.content.split('\n').length, 0);
  const passed = totalLines <= 300;
  return {
    name: 'diff-size',
    passed,
    output: `Total changed lines: ${totalLines}`,
    duration: 0,
  };
}

export async function checkNoRegression(
  testRunner: TestRunnerAdapter,
  baselineResult: { passed: number; total: number }
): Promise<CheckResult> {
  const start = Date.now();
  const result = await testRunner.runTests();
  const regression = result.passed < baselineResult.passed || result.total < baselineResult.total;
  return {
    name: 'regression-check',
    passed: !regression,
    output: `Before: ${baselineResult.passed}/${baselineResult.total} | After: ${result.passed}/${result.total}`,
    duration: Date.now() - start,
  };
}
