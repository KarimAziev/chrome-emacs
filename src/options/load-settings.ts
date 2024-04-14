import { defaultSettings } from '@/options/defaults';

export const loadSettings = async () => {
  try {
    const settings = await chrome.storage.local.get(
      Object.keys(defaultSettings),
    );
    return Object.entries(settings).reduce(
      (acc, [key, value]) => {
        if (value) {
          acc[key as keyof typeof defaultSettings] = value;
        }
        return acc;
      },
      { ...defaultSettings },
    );
  } catch (error) {
    return { ...defaultSettings };
  }
};
