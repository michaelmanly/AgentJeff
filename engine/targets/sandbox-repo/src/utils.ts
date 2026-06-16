export function clamp(value: number, min: number, max: number): number {
  // BUG: min > max not handled
  return Math.min(Math.max(value, min), max);
}

export function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i++) result.push(i);
  return result;
  // MISSING: step parameter, reverse range
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function sum(arr: number[]): number {
  // BUG: returns 0 for empty array but doesn't make it obvious this is intentional
  return arr.reduce((acc, val) => acc + val, 0);
}

export function average(arr: number[]): number {
  // BUG: division by zero for empty array
  return sum(arr) / arr.length;
}

export function flatten<T>(arr: (T | T[])[]): T[] {
  return arr.reduce<T[]>((acc, val) => acc.concat(val as T[]), []);
}

// MISSING: chunk, groupBy, zip, partition
