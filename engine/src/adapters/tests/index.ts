import { exec } from 'child_process';
import { promisify } from 'util';
import type { TestResult, LintResult } from '../../types.js';
import { createLogger } from '../../utils/logger.js';

const execAsync = promisify(exec);
const logger = createLogger('TestsAdapter');

export class TestsAdapter {
  constructor(private repoPath: string) {}

  async runTests(): Promise<TestResult> {
    const start = Date.now();
    try {
      const { stdout, stderr } = await execAsync('npm test -- --no-coverage 2>&1', {
        cwd: this.repoPath,
        timeout: 60000,
      });
      const output = stdout + stderr;
      const testsRun = this.parseTotalCount(output);
      const testsPassed = this.parsePassCount(output);
      const testsFailed = this.parseFailCount(output);
      
      return {
        passed: testsFailed === 0,
        testsRun,
        testsPassed,
        testsFailed,
        output,
        duration: Date.now() - start,
        timestamp: Date.now(),
      };
    } catch (err: unknown) {
      const error = err as { stdout?: string; stderr?: string; message?: string };
      const output = (error.stdout ?? '') + (error.stderr ?? '') + (error.message ?? '');
      const testsFailed = this.parseFailCount(output);
      const testsPassed = this.parsePassCount(output);
      
      return {
        passed: false,
        testsRun: testsPassed + testsFailed,
        testsPassed,
        testsFailed: testsFailed || 1,
        output,
        duration: Date.now() - start,
        timestamp: Date.now(),
      };
    }
  }

  async runLint(): Promise<LintResult> {
    const start = Date.now();
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit 2>&1', {
        cwd: this.repoPath,
        timeout: 30000,
      });
      const output = stdout + stderr;
      const errors = (output.match(/error TS\d+/g) ?? []).length;
      
      return {
        passed: errors === 0,
        errors,
        output,
        duration: Date.now() - start,
      };
    } catch (err: unknown) {
      const error = err as { stdout?: string; stderr?: string };
      const output = (error.stdout ?? '') + (error.stderr ?? '');
      const errors = (output.match(/error TS\d+/g) ?? []).length;
      
      return {
        passed: false,
        errors: errors || 1,
        output,
        duration: Date.now() - start,
      };
    }
  }

  async getTestHistory(): Promise<TestResult[]> {
    return [];
  }

  private parseTotalCount(output: string): number {
    const match = output.match(/Tests:\s+(?:\d+ failed,\s*)?(?:\d+ passed,\s*)?(\d+) total/);
    if (match) return parseInt(match[1] ?? '0', 10);
    return 0;
  }

  private parsePassCount(output: string): number {
    const match = output.match(/(\d+) passed/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private parseFailCount(output: string): number {
    const match = output.match(/(\d+) failed/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
