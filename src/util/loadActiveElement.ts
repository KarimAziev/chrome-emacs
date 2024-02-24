import { handlerFactory } from '@/handlers';
import { IHandlerConstructor } from '@/handlers/types';
import { isContentEditableElement, isElementTag } from '@/util/dom';
import { loadHandler } from '@/util/loadHandler';

export const loadActiveElementHandler = async () => {
  const activeEl = document?.activeElement;
  if (
    !activeEl ||
    (isElementTag('body', activeEl) && !isContentEditableElement(activeEl))
  ) {
    throw new Error('No handler');
  }
  const handler = handlerFactory.handlerFor(activeEl);

  if (handler) {
    return await loadHandler([handler, activeEl] as [
      IHandlerConstructor,
      HTMLTextAreaElement,
    ]);
  } else {
    throw new Error('No handler');
  }
};
