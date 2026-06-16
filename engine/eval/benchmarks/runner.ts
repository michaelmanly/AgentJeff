import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface BenchmarkResult {
  name: string;
  durationMs: number;
  passed: boolean;
  output: string;
}

export async function runBenchmarks(repoPath: string): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  
  const start = Date.now();
  try {
    const { stdout, stderr } = await execAsync('npm test -- --no-coverage', {
      cwd: repoPath,
      timeout: 60000,
    });
    results.push({
      name: 'full-test-suite',
      durationMs: Date.now() - start,
      passed: !stderr.includes('failed'),
      output: stdout + stderr,
    });
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string };
    results.push({
      name: 'full-test-suite',
      durationMs: Date.now() - start,
      passed: false,
      output: (error.stdout ?? '') + (error.stderr ?? ''),
    });
  }
  
  return results;
}
