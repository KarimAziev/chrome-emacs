import { loadActiveElementHandler } from '@/util/loadActiveElement';
import ElementReader from '@/content-script-tools/element-reader';
import { RuntimeSettings } from '@/options/runtime-settings';

const worker = async function () {
  try {
    await loadActiveElementHandler();
  } catch (_error) {
    await ElementReader.readAndLoadElement();
  } finally {
    RuntimeSettings.clearForceAllowVisibleInputsOverride();
  }
};

export async function init() {
  worker();
}

init();
