import { loadActiveElementHandler } from '@/util/loadActiveElement';
import ElementReader from '@/content-script-tools/element-reader';

const worker = async function () {
  try {
    await loadActiveElementHandler();
  } catch (_error) {
    await ElementReader.readAndLoadElement();
  }
};

export async function init() {
  worker();
}

init();
