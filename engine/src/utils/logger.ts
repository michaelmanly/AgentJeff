import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logsDir = join(__dirname, '../../artifacts/run-logs');
const date = new Date().toISOString().split('T')[0];
const logFile = join(logsDir, `engine-${date}.log`);

function ensureLogsDir() {
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
}

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function log(level: LogLevel, component: string, message: string, data?: unknown) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] [${component}] ${message}${data !== undefined ? ' ' + JSON.stringify(data) : ''}`;
  console.log(line);
  try {
    ensureLogsDir();
    appendFileSync(logFile, line + '\n');
  } catch {
    // ignore log write errors
  }
}

export function createLogger(component: string) {
  return {
    info: (message: string, data?: unknown) => log('INFO', component, message, data),
    warn: (message: string, data?: unknown) => log('WARN', component, message, data),
    error: (message: string, data?: unknown) => log('ERROR', component, message, data),
    debug: (message: string, data?: unknown) => log('DEBUG', component, message, data),
  };
}
