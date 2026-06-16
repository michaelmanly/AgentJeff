import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { FileChange, RepoObservation, TestRunResult } from '../../types.js';
import { logger } from '../../utils/logger.js';

const execFileAsync = promisify(execFile);

export class RepoAdapter {
  private root: string;

  constructor(repoPath: string) {
    this.root = path.resolve(repoPath);
  }

  private resolve(p: string): string {
    const resolved = path.resolve(this.root, p);
    if (!resolved.startsWith(this.root)) throw new Error(`Path escape: ${p}`);
    return resolved;
  }

  async exec(cmd: string, args: string[] = []): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const { stdout, stderr } = await execFileAsync(cmd, args, { cwd: this.root, timeout: 30000 });
      return { stdout, stderr, exitCode: 0 };
    } catch (err: any) {
      return { stdout: err.stdout ?? '', stderr: err.stderr ?? String(err), exitCode: err.code ?? 1 };
    }
  }

  async listFiles(dir = '.'): Promise<string[]> {
    const resolved = this.resolve(dir);
    try {
      const entries = await fs.readdir(resolved, { withFileTypes: true });
      return entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
    } catch {
      return [];
    }
  }

  async readFile(p: string): Promise<string> {
    return fs.readFile(this.resolve(p), 'utf-8');
  }

  async writeFile(p: string, content: string): Promise<void> {
    const resolved = this.resolve(p);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, 'utf-8');
  }

  async observe(): Promise<RepoObservation> {
    const [files, gitStatus, gitLog] = await Promise.all([
      this.listFiles('src'),
      this.exec('git', ['status', '--short']),
      this.exec('git', ['log', '--oneline', '-5']),
    ]);

    return {
      files,
      gitStatus: gitStatus.stdout.trim(),
      recentCommits: gitLog.stdout.trim().split('\n').filter(Boolean),
    };
  }

  async applyChanges(changes: FileChange[]): Promise<void> {
    for (const change of changes) {
      try {
        const existing = await this.readFile(change.path).catch(() => '');
        change.previousContent = existing;
        await this.writeFile(change.path, change.content);
        logger.info(`Applied change to ${change.path}`);
      } catch (err) {
        logger.error(`Failed to apply change to ${change.path}`, err);
        throw err;
      }
    }
  }

  async revertChanges(changes: FileChange[]): Promise<void> {
    for (const change of changes) {
      if (change.previousContent !== undefined) {
        await this.writeFile(change.path, change.previousContent);
        logger.info(`Reverted ${change.path}`);
      }
    }
  }

  async getDiff(): Promise<string> {
    const result = await this.exec('git', ['diff']);
    return result.stdout;
  }
}
