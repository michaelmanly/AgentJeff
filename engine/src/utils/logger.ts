import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'artifacts', 'run-logs');

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString();
}

const logDate = new Date().toISOString().slice(0, 10);
let logStream: fs.WriteStream | null = null;

function getStream(): fs.WriteStream {
  if (!logStream) {
    ensureDir();
    const logFile = path.join(LOG_DIR, `engine-${logDate}.log`);
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  }
  return logStream;
}

function write(level: string, msg: string, data?: unknown) {
  const line = `[${timestamp()}] [${level}] ${msg}${data !== undefined ? ' ' + JSON.stringify(data) : ''}`;
  console.log(line);
  try {
    getStream().write(line + '\n');
  } catch {
    // ignore log write failures
  }
}

export const logger = {
  info: (msg: string, data?: unknown) => write('INFO', msg, data),
  warn: (msg: string, data?: unknown) => write('WARN', msg, data),
  error: (msg: string, data?: unknown) => write('ERROR', msg, data),
  debug: (msg: string, data?: unknown) => write('DEBUG', msg, data),
};
