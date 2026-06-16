import { exec } from 'child_process';
import { promisify } from 'util';
import type { CheckResult, Proposal } from '../types.js';

const execAsync = promisify(exec);

export async function checkTypeScript(repoPath: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { stdout, stderr } = await execAsync('npx tsc --noEmit 2>&1', {
      cwd: repoPath,
      timeout: 30000,
    });
    const output = stdout + stderr;
    const errors = (output.match(/error TS\d+/g) ?? []).length;
    return {
      name: 'typescript',
      passed: errors === 0,
      output: output.slice(0, 2000),
      duration: Date.now() - start,
    };
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string };
    const output = (error.stdout ?? '') + (error.stderr ?? '');
    return {
      name: 'typescript',
      passed: false,
      output: output.slice(0, 2000),
      duration: Date.now() - start,
    };
  }
}

export async function checkTests(repoPath: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { stdout, stderr } = await execAsync('npm test -- --no-coverage 2>&1', {
      cwd: repoPath,
      timeout: 60000,
    });
    const output = stdout + stderr;
    const failed = (output.match(/(\d+) failed/) ?? [])[1];
    return {
      name: 'tests',
      passed: !failed || failed === '0',
      output: output.slice(0, 3000),
      duration: Date.now() - start,
    };
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string };
    const output = (error.stdout ?? '') + (error.stderr ?? '');
    return {
      name: 'tests',
      passed: false,
      output: output.slice(0, 3000),
      duration: Date.now() - start,
    };
  }
}

export function checkDiffSize(proposal: Proposal): CheckResult {
  const start = Date.now();
  let totalChars = 0;
  for (const change of proposal.changes) {
    totalChars += change.content.length;
    if (change.previousContent) totalChars += change.previousContent.length;
  }
  const reasonableLimit = 50000;
  return {
    name: 'diff-size',
    passed: totalChars <= reasonableLimit,
    output: `Total diff size: ${totalChars} chars (limit: ${reasonableLimit})`,
    duration: Date.now() - start,
  };
}

export function checkForbiddenPatterns(proposal: Proposal, forbiddenPatterns: string[]): CheckResult {
  const start = Date.now();
  const violations: string[] = [];
  
  for (const change of proposal.changes) {
    for (const pattern of forbiddenPatterns) {
      if (change.content.includes(pattern)) {
        violations.push(`${change.path}: contains forbidden pattern "${pattern}"`);
      }
    }
  }
  
  return {
    name: 'forbidden-patterns',
    passed: violations.length === 0,
    output: violations.length > 0 ? violations.join('\n') : 'No forbidden patterns found',
    duration: Date.now() - start,
  };
}
