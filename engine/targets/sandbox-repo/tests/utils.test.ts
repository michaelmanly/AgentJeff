import { clamp, range, unique, sum, average, flatten } from '../src/utils';

describe('utils', () => {
  describe('clamp', () => {
    it('clamps to min', () => expect(clamp(0, 5, 10)).toBe(5));
    it('clamps to max', () => expect(clamp(15, 5, 10)).toBe(10));
    it('returns value in range', () => expect(clamp(7, 5, 10)).toBe(7));
  });

  describe('range', () => {
    it('generates range', () => expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]));
    it('generates empty range', () => expect(range(5, 5)).toEqual([]));
  });

  describe('unique', () => {
    it('removes duplicates', () => expect(unique([1, 2, 2, 3])).toEqual([1, 2, 3]));
    it('handles empty array', () => expect(unique([])).toEqual([]));
  });

  describe('sum', () => {
    it('sums numbers', () => expect(sum([1, 2, 3])).toBe(6));
    it('sums empty array', () => expect(sum([])).toBe(0));
  });

  describe('average', () => {
    it('averages numbers', () => expect(average([2, 4, 6])).toBe(4));
    // NOTE: empty array case not yet tested
  });

  describe('flatten', () => {
    it('flattens one level', () => expect(flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4]));
  });
});
