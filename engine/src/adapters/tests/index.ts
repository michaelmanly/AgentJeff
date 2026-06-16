import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { TestRunResult } from '../../types.js';
import { logger } from '../../utils/logger.js';

const execFileAsync = promisify(execFile);

export class TestRunnerAdapter {
  private root: string;

  constructor(repoPath: string) {
    this.root = path.resolve(repoPath);
  }

  async runTests(): Promise<TestRunResult> {
    const start = Date.now();
    try {
      const { stdout, stderr } = await execFileAsync('npm', ['test', '--', '--json', '--no-coverage'], {
        cwd: this.root,
        timeout: 60000,
        env: { ...process.env, CI: 'true' },
      });
      const output = stdout + stderr;
      return this.parseJestOutput(output, Date.now() - start);
    } catch (err: any) {
      const output = (err.stdout ?? '') + (err.stderr ?? '');
      return this.parseJestOutput(output, Date.now() - start);
    }
  }

  private parseJestOutput(output: string, duration: number): TestRunResult {
    // Try to parse JSON output from jest --json
    const jsonMatch = output.match(/\{[\s\S]*"numFailedTests"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        return {
          passed: data.numPassedTests ?? 0,
          failed: data.numFailedTests ?? 0,
          total: data.numTotalTests ?? 0,
          duration,
          output,
        };
      } catch {}
    }

    // Fallback: parse text output
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const passed = parseInt(passedMatch?.[1] ?? '0');
    const failed = parseInt(failedMatch?.[1] ?? '0');

    return { passed, failed, total: passed + failed, duration, output };
  }

  async runLint(repoPath?: string): Promise<{ errors: number; output: string }> {
    const root = repoPath ?? this.root;
    try {
      const { stdout, stderr } = await execFileAsync('npx', ['tsc', '--noEmit'], {
        cwd: root,
        timeout: 30000,
      });
      return { errors: 0, output: stdout + stderr };
    } catch (err: any) {
      const output = (err.stdout ?? '') + (err.stderr ?? '');
      const errorCount = (output.match(/error TS\d+/g) ?? []).length;
      return { errors: errorCount, output };
    }
  }
}
