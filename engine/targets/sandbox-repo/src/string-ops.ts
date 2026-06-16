export function truncate(str: string, maxLength: number): string {
  // BUG: '...' makes output longer than maxLength
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

export function capitalize(str: string): string {
  // BUG: empty string returns undefined behavior
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function countWords(str: string): number {
  // BUG: multiple spaces, empty string returns 1 not 0
  return str.split(' ').length;
}

export function isPalindrome(str: string): boolean {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}

export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  // BUG: leading underscore for strings starting with uppercase
}

export function repeat(str: string, times: number): string {
  // BUG: negative times not handled
  return str.repeat(times);
}

// MISSING: slugify, escapeHtml, parseTemplate
