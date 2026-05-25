const ESC = '\x1b';
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const RED = `${ESC}[31m`;
const GRAY = `${ESC}[90m`;

function color(code: string, text: string): string {
  if (!process.stdout.isTTY) return text;
  return `${code}${text}${RESET}`;
}

export const fmt = {
  bold: (t: string) => color(BOLD, t),
  dim: (t: string) => color(DIM, t),
  green: (t: string) => color(GREEN, t),
  yellow: (t: string) => color(YELLOW, t),
  cyan: (t: string) => color(CYAN, t),
  red: (t: string) => color(RED, t),
  gray: (t: string) => color(GRAY, t),
};

const EVENT_COLORS: Record<string, string> = {
  'run.started': CYAN,
  'tool.called': YELLOW,
  'tool.succeeded': GREEN,
  'tool.failed': RED,
  'state.updated': GRAY,
  'run.completed': GREEN,
  'run.failed': RED,
  'checkpoint.created': CYAN,
};

export function printEvent(type: string, payload: unknown): void {
  const c = EVENT_COLORS[type] ?? GRAY;
  const tag = color(c, `[${type}]`);
  const body = JSON.stringify(payload).slice(0, 100);
  console.log(`  ${tag} ${color(GRAY, body)}`);
}

export function printHeader(title: string): void {
  console.log(`\n${color(BOLD + CYAN, title)}`);
}

export function printSuccess(msg: string): void {
  console.log(`${color(GREEN, '✓')} ${msg}`);
}

export function printError(msg: string, hint?: string): void {
  console.error(`${color(RED, '✗')} ${color(BOLD, msg)}`);
  if (hint) console.error(`  ${color(GRAY, hint)}`);
}

export function printResult(label: string, value: unknown): void {
  console.log(`\n${color(BOLD, label)}`);
  if (typeof value === 'string') {
    console.log(value);
  } else {
    console.log(JSON.stringify(value, null, 2));
  }
}

export function printStatus(status: string, durationMs?: number): void {
  const statusColor = status === 'completed' ? GREEN : RED;
  const s = color(statusColor, status);
  const d = durationMs !== undefined ? color(GRAY, ` (${durationMs}ms)`) : '';
  console.log(`\n${color(DIM, 'Status:')} ${s}${d}`);
}

let spinnerTimer: ReturnType<typeof setInterval> | null = null;
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIdx = 0;

export function startSpinner(msg: string): void {
  if (!process.stdout.isTTY) {
    process.stdout.write(`${msg}...\n`);
    return;
  }
  process.stdout.write(`  `);
  spinnerTimer = setInterval(() => {
    process.stdout.write(`\r  ${color(CYAN, SPINNER_FRAMES[spinnerIdx % SPINNER_FRAMES.length])} ${msg}`);
    spinnerIdx++;
  }, 80);
}

export function stopSpinner(success = true): void {
  if (spinnerTimer) {
    clearInterval(spinnerTimer);
    spinnerTimer = null;
  }
  if (process.stdout.isTTY) {
    process.stdout.write('\r\x1b[2K');
  }
}
