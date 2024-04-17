export const READONLY_KEY = 'Escape';
export const DEFAULT_HINTS = 'ASDFGQWERTZXCVB';

export const defaultKeySettings: Record<string, string[]> = {
  exitHint: [READONLY_KEY, 'Ctrl-g'],
};

export const defaultSettings = {
  hints: DEFAULT_HINTS,
  keybindings: defaultKeySettings,
};
