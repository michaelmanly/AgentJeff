import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('LogsAdapter');

export class LogsAdapter {
  constructor(private logsDir: string) {}

  readLatestLog(): string {
    if (!existsSync(this.logsDir)) return '';
    try {
      const files = readdirSync(this.logsDir)
        .filter(f => f.endsWith('.log'))
        .sort()
        .reverse();
      if (files.length === 0) return '';
      return readFileSync(join(this.logsDir, files[0]), 'utf-8');
    } catch {
      return '';
    }
  }

  readLogLines(n: number = 100): string[] {
    const content = this.readLatestLog();
    const lines = content.split('\n').filter(Boolean);
    return lines.slice(-n);
  }
}
