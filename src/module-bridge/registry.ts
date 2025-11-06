export const MODULE_REGISTRY_KEY = '__chromeEmacsModuleRegistry';

export type ModuleRegistry = Record<string, (...args: unknown[]) => unknown>;

type GlobalWithRegistry = typeof globalThis & {
  [MODULE_REGISTRY_KEY]?: ModuleRegistry;
};

export const registerModuleFunction = (
  name: string,
  fn: (...args: unknown[]) => unknown,
) => {
  const global = globalThis as GlobalWithRegistry;

  if (!global[MODULE_REGISTRY_KEY]) {
    global[MODULE_REGISTRY_KEY] = Object.create(null);
  }

  global[MODULE_REGISTRY_KEY]![name] = fn;
};
