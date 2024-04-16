import {
  splitKeySequence,
  isValueMatches,
  replaceNonBreakingSpaces,
  splitPreservingConsecutiveSeparators,
  capitalize,
  htmlEscape,
  generateStringHash,
} from '@/util/string';

describe('capitalize', () => {
  it('should capitalize lowercase string', () => {
    expect(capitalize('test')).toBe('Test');
  });

  it('should return the same string if the first character is uppercase', () => {
    expect(capitalize('Test')).toBe('Test');
  });

  it('should return non-string input as is', () => {
    const input: any = 123;
    expect(capitalize(input)).toBe(123);
  });

  it('should handle empty strings correctly', () => {
    expect(capitalize('')).toBe('');
  });

  it('should handle strings with one char correctly', () => {
    expect(capitalize('b')).toBe('B');
  });
});

describe('htmlEscape', () => {
  it('should escape all HTML entities correctly', () => {
    expect(htmlEscape('<script>alert("XSS")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
    );
  });

  it('should return non-string input as is', () => {
    const input: any = { html: '<div></div>' };
    expect(htmlEscape(input)).toBe(input);
  });

  it('should handle empty strings correctly', () => {
    expect(htmlEscape('')).toBe('');
  });

  it('should escape strings with only a single character that needs escaping', () => {
    expect(htmlEscape('<')).toBe('&lt;');
  });
});

describe('generateStringHash', () => {
  it('should generate a hash for a string', () => {
    const result = generateStringHash('test');
    expect(typeof result).toBe('number');
  });

  it('should generate the same hash for the same string', () => {
    const str = 'hello';
    expect(generateStringHash(str)).toBe(generateStringHash(str));
  });

  it('should generate different hashes for different strings', () => {
    expect(generateStringHash('hello')).not.toBe(generateStringHash('world'));
  });

  it('should properly handle an empty string', () => {
    expect(generateStringHash('')).toBe(0);
  });
});

describe('isValueMatches', () => {
  it('should return true for an exact match', () => {
    expect(isValueMatches('hello', 'hello world')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isValueMatches('HELLO', 'hello world')).toBe(true);
  });

  it('should return true for a word match within a string', () => {
    expect(isValueMatches('world', 'hello world')).toBe(true);
  });

  it('should return false for a non-match', () => {
    expect(isValueMatches('bye', 'hello world')).toBe(false);
  });

  it('should ignore non-word characters and still find a match', () => {
    expect(isValueMatches('world', 'hello, world!')).toBe(true);
  });

  it('should return false when the value contains non-word characters', () => {
    expect(isValueMatches('hello,', 'hello world')).toBe(false);
  });

  it('should return false when searching for an empty string', () => {
    expect(isValueMatches('', 'hello world')).toBe(false);
  });

  it('should handle a case where the search string is empty', () => {
    expect(isValueMatches('test', '')).toBe(false);
  });

  it('should handle strings consisting only of non-word characters', () => {
    expect(isValueMatches('!', '!@#$%^&')).toBe(false);
    expect(isValueMatches('test', '!@#$%^&')).toBe(false);
  });

  it('should distinguish words in a string with mixed non-word characters', () => {
    expect(isValueMatches('hello', 'hello-world!hello')).toBe(true);
    expect(isValueMatches('world', 'hello-world!hello')).toBe(true);
  });
});

describe('replaceNonBreakingSpaces', () => {
  it('should replace non-breaking spaces with a space in a string', () => {
    const input = `Hello\u00A0World`;
    const expected = 'Hello World';
    expect(replaceNonBreakingSpaces(input)).toEqual(expected);
  });

  it('should replace multiple non-breaking spaces with spaces in a string', () => {
    const input = `Hello\u00A0\u00A0World`;
    const expected = 'Hello  World';
    expect(replaceNonBreakingSpaces(input)).toEqual(expected);
  });

  it('should replace non-breaking spaces with a provided replacement character', () => {
    const input = `Hello\u00A0World`;
    const replacement = '-';
    const expected = 'Hello-World';
    expect(replaceNonBreakingSpaces(input, replacement)).toEqual(expected);
  });

  it('returns the original string if no non-breaking spaces are found', () => {
    const input = `Hello World`;
    const expected = 'Hello World';
    expect(replaceNonBreakingSpaces(input)).toEqual(expected);
  });

  it('should return the input as is for non-string values', () => {
    const input = 12345;
    expect(replaceNonBreakingSpaces(input)).toEqual(input);
  });
});

describe('splitKeySequence', () => {
  test.each([
    ['Ctrl-x f r', ['Ctrl', 'x', 'f', 'r']],
    ['Ctrl-x   r', ['Ctrl', 'x', ' ', 'r']],
    ['Ctrl-x  ', ['Ctrl', 'x', ' ']],
    ['Ctrl--   r', ['Ctrl', '-', ' ', 'r']],
    ['Ctrl-Alt--   r', ['Ctrl', 'Alt', '-', ' ', 'r']],
    ['', []],
    ['q', ['q']],
    ['Ctrl-g', ['Ctrl', 'g']],
    ['Escape', ['Escape']],
    ['Q', ['Q']],
    ['Ctrl-x Space', ['Ctrl', 'x', ' ']],
    ['Ctrl-Space', ['Ctrl', ' ']],
    ['space', [' ']],
    ['spc', [' ']],
    ['SPC', [' ']],
    ['Space', [' ']],
    [' ', [' ']],
    ['Space Space', [' ', ' ']],
  ])('splitKeySequence("%s") => %s', (str, expected) => {
    expect(splitKeySequence(str)).toEqual(expected);
  });
});

describe('splitPreservingConsecutiveSeparators', () => {
  test.each([
    ['Ctrl-x f r', ['Ctrl', 'x', 'f', 'r']],
    ['Ctrl-x   r', ['Ctrl', 'x', ' ', 'r']],
    ['Ctrl-x  ', ['Ctrl', 'x', ' ']],
    ['Ctrl--   r', ['Ctrl', '-', ' ', 'r']],
    ['Ctrl-Alt--   r', ['Ctrl', 'Alt', '-', ' ', 'r']],
    ['', []],
    ['q', ['q']],
    ['Ctrl-g', ['Ctrl', 'g']],
    ['Escape', ['Escape']],
    ['Q', ['Q']],
    ['Ctrl-x  ', ['Ctrl', 'x', ' ']],
    ['Ctrl-x ', ['Ctrl', 'x']],
    [' ', [' ']],
  ])('splitPreservingConsecutiveSeparators("%s") => %s', (str, expected) => {
    expect(splitPreservingConsecutiveSeparators(str, ['-', ' '])).toEqual(
      expected,
    );
  });
});
