import fs from 'fs/promises';
import path from 'path';

export class LogAdapter {
  private logDir: string;

  constructor(logDir: string) {
    this.logDir = path.resolve(logDir);
  }

  async readLatest(n = 100): Promise<string[]> {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files.filter((f) => f.endsWith('.log')).sort().reverse();
      if (!logFiles.length) return [];
      const content = await fs.readFile(path.join(this.logDir, logFiles[0]), 'utf-8');
      return content.split('\n').filter(Boolean).slice(-n);
    } catch {
      return [];
    }
  }

  async readErrors(n = 50): Promise<string[]> {
    const lines = await this.readLatest(500);
    return lines.filter((l) => l.includes('[ERROR]')).slice(-n);
  }
}
