import { truncate, capitalize, countWords } from '../src/string-ops';

describe('string-ops', () => {
  test('truncate shortens long strings', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
    expect(truncate('hi', 10)).toBe('hi');
  });

  test('capitalize uppercases first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
  });

  test('countWords counts words', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('one two three')).toBe(3);
  });
});
