import { clamp, range, unique } from '../src/utils';

describe('utils', () => {
  test('clamp keeps value in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  test('range generates array', () => {
    expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(range(3, 6)).toEqual([3, 4, 5]);
    expect(range(5, 5)).toEqual([]);
  });

  test('unique removes duplicates', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    expect(unique(['a', 'b', 'a'])).toEqual(['a', 'b']);
    expect(unique([])).toEqual([]);
  });
});
