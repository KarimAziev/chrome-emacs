import { isString, isFunction, isNumber } from '@/util/guard';

describe('guard utilities', () => {
  describe('isString function', () => {
    it('should return true for string values', () => {
      expect(isString('hello')).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(isString(123)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
      expect(isString(() => {})).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString(null)).toBe(false);
    });
  });

  describe('isFunction function', () => {
    it('should return true for function values', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function () {})).toBe(true);
      expect(isFunction(class MyClass {})).toBe(true);
    });

    it('should return false for non-function values', () => {
      expect(isFunction('hello')).toBe(false);
      expect(isFunction(123)).toBe(false);
      expect(isFunction({})).toBe(false);
      expect(isFunction([])).toBe(false);
      expect(isFunction(undefined)).toBe(false);
      expect(isFunction(null)).toBe(false);
    });
  });

  describe('isNumber function', () => {
    it('should return true for number values', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(-123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(NaN)).toBe(true);
    });

    it('should return false for non-number values', () => {
      expect(isNumber('hello')).toBe(false);
      expect(isNumber({})).toBe(false);
      expect(isNumber([])).toBe(false);
      expect(isNumber(() => {})).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber(null)).toBe(false);
    });
  });
});
