import { loadActiveElementHandler } from '@/util/loadActiveElement';
import { registerModuleFunction } from '@/module-bridge/registry';

registerModuleFunction('loadActiveElementHandler', async () => {
  return loadActiveElementHandler();
});
