export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  // BUG: no division by zero check
  return a / b;
}

export function power(base: number, exp: number): number {
  return Math.pow(base, exp);
}

export function squareRoot(n: number): number {
  // BUG: no check for negative numbers
  return Math.sqrt(n);
}

export function percentage(value: number, total: number): number {
  // BUG: no check for total === 0
  return (value / total) * 100;
}

// MISSING: modulo, absolute value, factorial, clamp
