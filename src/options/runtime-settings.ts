import { defaultSettings } from '@/options/defaults';
import { loadSettings } from '@/options/load-settings';

export const FORCE_VISIBLE_INPUTS_FLAG = '__chromeEmacsForceAllowVisibleInputs';

type ForceAllowVisibleInputsGlobal = typeof globalThis & {
  __chromeEmacsForceAllowVisibleInputs?: boolean;
};

const hasForceAllowVisibleInputsOverride = () => {
  if (typeof globalThis === 'undefined') {
    return false;
  }

  return Boolean(
    (globalThis as ForceAllowVisibleInputsGlobal)[FORCE_VISIBLE_INPUTS_FLAG],
  );
};

const clearForceAllowVisibleInputsOverrideFlag = () => {
  if (typeof globalThis === 'undefined') {
    return;
  }

  delete (globalThis as ForceAllowVisibleInputsGlobal)[
    FORCE_VISIBLE_INPUTS_FLAG
  ];
};

export type RuntimeSettingsState = typeof defaultSettings;

class RuntimeSettings {
  private static settings: RuntimeSettingsState = { ...defaultSettings };
  private static loadPromise: Promise<RuntimeSettingsState> | null = null;
  private static loaded = false;

  static get(): RuntimeSettingsState {
    return this.settings;
  }

  static merge(partial: Partial<RuntimeSettingsState>) {
    this.settings = { ...this.settings, ...partial };
    this.loaded = true;
  }

  static async ensureLoaded(): Promise<RuntimeSettingsState> {
    if (this.loaded) {
      return this.settings;
    }

    const canLoadFromStorage =
      typeof chrome !== 'undefined' &&
      !!chrome.storage?.local?.get &&
      typeof chrome.storage.local.get === 'function';

    if (!canLoadFromStorage) {
      this.loaded = true;
      return this.settings;
    }

    if (!this.loadPromise) {
      this.loadPromise = loadSettings()
        .then((settings) => {
          this.settings = { ...defaultSettings, ...settings };
          return this.settings;
        })
        .catch(() => {
          this.settings = { ...defaultSettings };
          return this.settings;
        })
        .finally(() => {
          this.loaded = true;
          this.loadPromise = null;
        });
    }

    return this.loadPromise;
  }

  static shouldAllowVisibleInputs(): boolean {
    return (
      RuntimeSettings.get().allowVisibleInputs ||
      hasForceAllowVisibleInputsOverride()
    );
  }

  static clearForceAllowVisibleInputsOverride(): void {
    clearForceAllowVisibleInputsOverrideFlag();
  }
}

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }

    const updates: Partial<RuntimeSettingsState> = {};

    (Object.keys(defaultSettings) as (keyof RuntimeSettingsState)[]).forEach(
      (key) => {
        const change = changes[key as string];
        if (!change) {
          return;
        }
        updates[key] =
          typeof change.newValue === 'undefined'
            ? defaultSettings[key]
            : change.newValue;
      },
    );

    if (Object.keys(updates).length > 0) {
      RuntimeSettings.merge(updates);
    }
  });
}

export { RuntimeSettings };
