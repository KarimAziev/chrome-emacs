import { isString } from '@/util/guard';

export const capitalize = <T>(s: T) =>
  isString(s) ? s[0].toUpperCase() + s.slice(1) : s;

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
