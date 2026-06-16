import { randomBytes } from 'crypto';

export function generateId(prefix: string = ''): string {
  const bytes = randomBytes(8).toString('hex');
  const ts = Date.now().toString(36);
  return prefix ? `${prefix}-${ts}-${bytes}` : `${ts}-${bytes}`;
}
