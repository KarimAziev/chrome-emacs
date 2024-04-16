import { isString } from '@/util/guard';

export const capitalize = <T>(s: T) =>
  s === '' ? s : isString(s) ? s[0].toUpperCase() + s.slice(1) : s;

export const htmlEscape = <T>(s: T) =>
  isString(s)
    ? s
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    : s;

export const replaceNonBreakingSpaces = <T>(s: T, rep = ' ') =>
  isString(s) ? s.replace(/\u00A0/g, rep) : s;

export const isValueMatches = (value: string, str: string): boolean => {
  // Split the string into segments based on non-word characters to consider entire words/phrases only
  const segments = str.toLowerCase().split(/\W+/);
  return segments.includes(value.toLowerCase());
};

export function generateStringHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function splitPreservingConsecutiveSeparators(
  str: string,
  separators: string[],
): string[] {
  const dictSet = new Set<string>(separators);

  if (dictSet.has(str)) {
    return [str];
  }

  let result: string[] = [];

  let buffer = '';
  let i = 0;

  while (i < str.length) {
    const char = str[i];
    const nextChar = i + 1 < str.length && str[i + 1];
    const isSeparator = dictSet.has(char);

    if (isSeparator && nextChar === char) {
      if (buffer.length > 0) {
        result.push(buffer);
        buffer = '';
      }
      result.push(str[i]);

      i += 2;
    } else if (!isSeparator) {
      buffer += str[i++];
    } else {
      if (buffer.length > 0) {
        result.push(buffer);
        buffer = '';
      }
      i++;
    }
  }

  if (buffer.length > 0) {
    result.push(buffer);
  }

  return result;
}

export const splitKeySequence = (str: string): string[] =>
  splitPreservingConsecutiveSeparators(
    str
      .replace(/(^|\s|-)(space|spc)(?=$)/gi, ' space ')
      .replace(/(^)(space|spc)(?=$|\s|-)/gi, ' space')
      .replace(/(^|\s|-)(space|spc)(?=$|\s|-)/gi, '$1 '),
    ['-', ' '],
  );
