import { KeyboardMapper } from '@/util/keyboard-mapper';

describe('KeyboardMapper', () => {
  let originalUserAgent: PropertyDescriptor | undefined;
  beforeEach(() => {
    originalUserAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
  });

  afterEach(() => {
    if (originalUserAgent) {
      Object.defineProperty(window.navigator, 'userAgent', originalUserAgent);
    }
  });

  describe('isShiftKey', () => {
    it('should return true for Shift keys', () => {
      expect(KeyboardMapper.isShiftKey('Shift')).toBeTruthy();
      expect(KeyboardMapper.isShiftKey('ShiftLeft')).toBeTruthy();
      expect(KeyboardMapper.isShiftKey('ShiftRight')).toBeTruthy();
    });

    it('should return false for non-Shift keys', () => {
      expect(KeyboardMapper.isShiftKey('Ctrl')).toBeFalsy();
    });
  });

  describe('isAltKey', () => {
    it('should return true for Alt keys', () => {
      expect(KeyboardMapper.isAltKey('Alt')).toBeTruthy();
      expect(KeyboardMapper.isAltKey('AltLeft')).toBeTruthy();
      expect(KeyboardMapper.isAltKey('AltRight')).toBeTruthy();
    });

    it('should return false for non-Alt keys', () => {
      expect(KeyboardMapper.isAltKey('Ctrl')).toBeFalsy();
    });
  });

  describe('isCtrlKey', () => {
    it('should return true for Ctrl keys', () => {
      expect(KeyboardMapper.isCtrlKey('Ctrl')).toBeTruthy();
      expect(KeyboardMapper.isCtrlKey('ControlLeft')).toBeTruthy();
      expect(KeyboardMapper.isCtrlKey('ControlRight')).toBeTruthy();
    });

    it('should return false for non-Ctrl keys', () => {
      expect(KeyboardMapper.isCtrlKey('Alt')).toBeFalsy();
    });
  });

  describe('isMetaKey', () => {
    it('should return true for Meta keys', () => {
      expect(KeyboardMapper.isMetaKey('MetaLeft')).toBeTruthy();
      expect(KeyboardMapper.isMetaKey('MetaRight')).toBeTruthy();
    });

    it('should return false for non-Meta keys', () => {
      expect(KeyboardMapper.isMetaKey('Ctrl')).toBeFalsy();
    });
  });

  describe('isModifier', () => {
    it('should return true for modifier keys', () => {
      expect(KeyboardMapper.isModifier('Shift')).toBeTruthy();
      expect(KeyboardMapper.isModifier('Ctrl')).toBeTruthy();
      expect(KeyboardMapper.isModifier('Alt')).toBeTruthy();
      expect(KeyboardMapper.isModifier('MetaLeft')).toBeTruthy();
    });

    it('should return false for non-modifier keys', () => {
      expect(KeyboardMapper.isModifier('a')).toBeFalsy();
    });
  });

  describe('getKeyConfig', () => {
    it('should return the correct configuration for a given key', () => {
      const shiftConfig = KeyboardMapper.getKeyConfig('Shift');
      expect(shiftConfig).toEqual({
        keyCode: 16,
        key: 'Shift',
        shiftKey: true,
        code: 'ShiftLeft',
        location: 1,
      });

      const nonModifierConfig = KeyboardMapper.getKeyConfig('a');
      expect(nonModifierConfig).toEqual({
        keyCode: 65,
        key: 'a',
        code: 'KeyA',
      });
    });
  });

  describe('maybeTranslateToMac', () => {
    it('should translate Ctrl to Meta on Mac', () => {
      jest
        .spyOn(window.navigator, 'userAgent', 'get')
        .mockReturnValue('Macintosh');

      const result = KeyboardMapper.maybeTranslateToMac({
        ctrlKey: true,
        key: 'a',
      });

      expect(result).toEqual({
        ctrlKey: false,
        metaKey: true,
        key: 'a',
      });
    });

    it('should not translate on non-Mac', () => {
      jest
        .spyOn(window.navigator, 'userAgent', 'get')
        .mockReturnValue('Windows');

      const result = KeyboardMapper.maybeTranslateToMac({
        ctrlKey: true,
        key: 'a',
      });

      expect(result).toEqual({
        ctrlKey: true,
        key: 'a',
      });
    });
  });
});
