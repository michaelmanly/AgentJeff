export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
  // BUG: ellipsis makes it longer than maxLength
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
  // BUG: empty string throws (actually returns empty, but charAt(0) on empty is '')
}

export function countWords(str: string): number {
  return str.split(' ').length; // BUG: multiple spaces, empty string
}
