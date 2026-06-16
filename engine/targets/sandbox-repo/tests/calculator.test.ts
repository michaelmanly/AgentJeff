import { add, subtract, multiply, divide, power } from '../src/calculator';

describe('calculator', () => {
  test('add returns correct sum', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
    expect(add(0, 0)).toBe(0);
  });

  test('subtract returns correct difference', () => {
    expect(subtract(5, 3)).toBe(2);
    expect(subtract(0, 5)).toBe(-5);
  });

  test('multiply returns correct product', () => {
    expect(multiply(3, 4)).toBe(12);
    expect(multiply(-2, 3)).toBe(-6);
    expect(multiply(0, 100)).toBe(0);
  });

  test('divide returns correct quotient', () => {
    expect(divide(10, 2)).toBe(5);
    expect(divide(7, 2)).toBe(3.5);
    // Note: divide by zero not handled
  });

  test('power returns correct result', () => {
    expect(power(2, 3)).toBe(8);
    expect(power(5, 0)).toBe(1);
  });
});
