import { handlerFactory } from '@/handlers';
import { isContentEditableElement, isElementTag } from '@/util/dom';
import { loadHandler } from '@/util/loadHandler';
import { RuntimeSettings } from '@/options/runtime-settings';

export const loadActiveElementHandler = async () => {
  const activeEl = document?.activeElement;
  if (
    !activeEl ||
    (isElementTag('body', activeEl) && !isContentEditableElement(activeEl))
  ) {
    throw new Error('No handler');
  }
  if (!(activeEl instanceof HTMLElement)) {
    throw new Error('No handler');
  }
  await RuntimeSettings.ensureLoaded();
  const handler = handlerFactory.handlerFor(activeEl);

  if (handler) {
    await loadHandler([handler, activeEl]);
    return true;
  } else {
    throw new Error('No handler');
  }
};
