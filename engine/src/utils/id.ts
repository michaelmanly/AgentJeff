import { randomBytes } from 'crypto';

export function newId(): string {
  return randomBytes(8).toString('hex');
}
