import { truncate, capitalize, countWords, isPalindrome, camelToSnake, repeat } from '../src/string-ops';

describe('string-ops', () => {
  describe('truncate', () => {
    it('truncates long string', () => {
      const result = truncate('hello world', 5);
      expect(result).toBe('hello...');
    });
    it('leaves short string unchanged', () => expect(truncate('hi', 5)).toBe('hi'));
  });

  describe('capitalize', () => {
    it('capitalizes first letter', () => expect(capitalize('hello')).toBe('Hello'));
    it('handles already capitalized', () => expect(capitalize('Hello')).toBe('Hello'));
  });

  describe('countWords', () => {
    it('counts words', () => expect(countWords('hello world')).toBe(2));
    it('counts single word', () => expect(countWords('hello')).toBe(1));
  });

  describe('isPalindrome', () => {
    it('detects palindrome', () => expect(isPalindrome('racecar')).toBe(true));
    it('detects non-palindrome', () => expect(isPalindrome('hello')).toBe(false));
    it('handles spaces', () => expect(isPalindrome('A man a plan a canal Panama')).toBe(true));
  });

  describe('camelToSnake', () => {
    it('converts camelCase', () => expect(camelToSnake('camelCase')).toBe('camel_case'));
    it('converts multi-word', () => expect(camelToSnake('myVariableName')).toBe('my_variable_name'));
  });

  describe('repeat', () => {
    it('repeats string', () => expect(repeat('ab', 3)).toBe('ababab'));
    it('repeats zero times', () => expect(repeat('ab', 0)).toBe(''));
  });
});
