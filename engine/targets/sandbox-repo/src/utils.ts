export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max); // BUG: min > max not handled
}

export function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i++) result.push(i);
  return result; // MISSING: step parameter, reverse range
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

// MISSING: chunk, flatten, groupBy
