import { add, subtract, multiply, divide, power, squareRoot, percentage } from '../src/calculator';

describe('calculator', () => {
  describe('add', () => {
    it('adds two positive numbers', () => expect(add(2, 3)).toBe(5));
    it('adds negative numbers', () => expect(add(-1, -2)).toBe(-3));
    it('adds zero', () => expect(add(5, 0)).toBe(5));
  });

  describe('subtract', () => {
    it('subtracts two numbers', () => expect(subtract(5, 3)).toBe(2));
    it('subtracts to negative', () => expect(subtract(2, 5)).toBe(-3));
  });

  describe('multiply', () => {
    it('multiplies two numbers', () => expect(multiply(3, 4)).toBe(12));
    it('multiplies by zero', () => expect(multiply(5, 0)).toBe(0));
  });

  describe('divide', () => {
    it('divides two numbers', () => expect(divide(10, 2)).toBe(5));
    it('divides with decimal result', () => expect(divide(7, 2)).toBe(3.5));
    // NOTE: division by zero not yet tested — engine should find this
  });

  describe('power', () => {
    it('raises to power', () => expect(power(2, 3)).toBe(8));
    it('power of zero', () => expect(power(5, 0)).toBe(1));
  });

  describe('squareRoot', () => {
    it('calculates square root', () => expect(squareRoot(9)).toBe(3));
    it('calculates square root of 0', () => expect(squareRoot(0)).toBe(0));
  });

  describe('percentage', () => {
    it('calculates percentage', () => expect(percentage(50, 200)).toBe(25));
  });
});
