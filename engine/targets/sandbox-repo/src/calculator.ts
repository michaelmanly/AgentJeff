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
  return a / b; // BUG: no division by zero check
}

export function power(base: number, exp: number): number {
  return Math.pow(base, exp);
}

// MISSING: modulo, absolute value, factorial
