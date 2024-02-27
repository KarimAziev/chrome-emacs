import { loadActiveElementHandler } from '@/util/loadActiveElement';
import { readAndLoadElement } from '@/util/readAndLoadElement';

const worker = async function () {
  try {
    await loadActiveElementHandler();
  } catch (_error) {
    await readAndLoadElement();
  }
};

export async function init() {
  worker();
}
init();
