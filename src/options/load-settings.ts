import { defaultSettings } from '@/options/defaults';

export const loadSettings = async () => {
  try {
    const settings = await chrome.storage.local.get(
      Object.keys(defaultSettings),
    );
    return Object.entries(settings).reduce(
      (acc, [key, value]) => {
        if (value) {
          const typed_key = key as keyof typeof defaultSettings;
          acc[typed_key] = value as never;
        }
        return acc;
      },
      { ...defaultSettings },
    );
  } catch (error) {
    return { ...defaultSettings };
  }
};
