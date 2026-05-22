import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { WorkspaceAdapter } from '@newatom/core';

const execFileAsync = promisify(execFile);

export interface WorkspaceAdapterOptions {
  root: string;
  allowExec?: boolean;
}

export class LocalWorkspaceAdapter implements WorkspaceAdapter {
  private root: string;
  private allowExec: boolean;

  constructor(opts: WorkspaceAdapterOptions) {
    this.root = path.resolve(opts.root);
    this.allowExec = opts.allowExec ?? false;
  }

  private resolve(p: string): string {
    const resolved = path.resolve(this.root, p);
    if (!resolved.startsWith(this.root)) {
      throw new Error(`Path escape detected: ${p}`);
    }
    return resolved;
  }

  async listFiles(dir: string): Promise<string[]> {
    const resolved = this.resolve(dir);
    const entries = await fs.readdir(resolved, { withFileTypes: true });
    const results: string[] = [];
    for (const e of entries) {
      results.push(e.isDirectory() ? `${e.name}/` : e.name);
    }
    return results;
  }

  async readFile(p: string): Promise<string> {
    return fs.readFile(this.resolve(p), 'utf-8');
  }

  async writeFile(p: string, content: string): Promise<void> {
    const resolved = this.resolve(p);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, 'utf-8');
  }

  async exec(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (!this.allowExec) throw new Error('exec is disabled for this workspace adapter');
    try {
      const parts = command.split(' ');
      const { stdout, stderr } = await execFileAsync(parts[0], parts.slice(1), {
        cwd: this.root,
      });
      return { stdout, stderr, exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? String(err),
        exitCode: err.code ?? 1,
      };
    }
  }
}
