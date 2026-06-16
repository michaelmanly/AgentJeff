import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { RepoObservation, FileChange } from '../../types.js';
import { createLogger } from '../../utils/logger.js';

const execAsync = promisify(exec);
const logger = createLogger('RepoAdapter');

export class RepoAdapter {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  async observe(): Promise<RepoObservation> {
    const files = this.listFiles(this.repoPath);
    
    let gitStatus = '';
    let recentCommits: string[] = [];
    
    try {
      const { stdout: status } = await execAsync('git status --short', { cwd: this.repoPath });
      gitStatus = status;
    } catch {
      gitStatus = 'git not available';
    }
    
    try {
      const { stdout: log } = await execAsync('git log --oneline -10', { cwd: this.repoPath });
      recentCommits = log.trim().split('\n').filter(Boolean);
    } catch {
      recentCommits = [];
    }
    
    const fileContents: Record<string, string> = {};
    const srcFiles = files.filter(f => f.endsWith('.ts') && !f.includes('node_modules'));
    for (const file of srcFiles.slice(0, 20)) {
      try {
        fileContents[file] = readFileSync(join(this.repoPath, file), 'utf-8');
      } catch {
        // skip unreadable files
      }
    }
    
    return { files, gitStatus, recentCommits, fileContents };
  }

  private listFiles(dir: string, base: string = ''): string[] {
    const results: string[] = [];
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
        const fullPath = join(dir, entry);
        const relPath = base ? `${base}/${entry}` : entry;
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...this.listFiles(fullPath, relPath));
        } else {
          results.push(relPath);
        }
      }
    } catch {
      // ignore
    }
    return results;
  }

  async applyChanges(changes: FileChange[]): Promise<void> {
    for (const change of changes) {
      const fullPath = join(this.repoPath, change.path);
      if (existsSync(fullPath)) {
        change.previousContent = readFileSync(fullPath, 'utf-8');
      }
      writeFileSync(fullPath, change.content, 'utf-8');
      logger.info(`Applied change to ${change.path}`);
    }
  }

  async revertChanges(changes: FileChange[]): Promise<void> {
    for (const change of changes) {
      if (change.previousContent !== undefined) {
        const fullPath = join(this.repoPath, change.path);
        writeFileSync(fullPath, change.previousContent, 'utf-8');
        logger.info(`Reverted ${change.path}`);
      }
    }
  }

  async getDiff(): Promise<string> {
    try {
      const { stdout } = await execAsync('git diff', { cwd: this.repoPath });
      return stdout;
    } catch {
      return '';
    }
  }
}
