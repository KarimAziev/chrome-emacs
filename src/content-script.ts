import {
  contentEvents,
  elementNormalizer,
  textSyncer,
} from '@/content-script-tools';
import { handlerFactory } from '@/handlers';
import { IHandler, Options } from '@/handlers/types';
import { findAndFocusBiggestTextArea } from '@/util/dom';

/**
 * Retrieves an appropriate handler for the provided HTML Element.
 * @param elem - The DOM element for which to get a handler, or null.
 * @returns An instance of a handler for the element, or undefined if element is null or unsupported.
 */
function getHandler(elem: Element | null) {
  if (!elem) {
    return;
  }

  const activeElement = elementNormalizer.normalize(elem);

  const Handler = handlerFactory.handlerFor(activeElement);

  if (!Handler && activeElement && activeElement.tagName) {
    const elemName = activeElement.tagName.toLowerCase();
    console.error(`Chrome Emacs does not support <${elemName}> (yet?)`);
    return;
  }

  return Handler ? new Handler(activeElement, contentEvents) : null;
}

/**
 * Initializes the extension by attempting to find an appropriate handler for the
 * current or largest text area and syncing text if successful.
 */
function init() {
  const handler =
    getHandler(document.activeElement) ||
    getHandler(findAndFocusBiggestTextArea());

  handler?.load().then((options) => {
    textSyncer.linkElem(
      document.URL,
      document.title,
      handler as unknown as IHandler,
      options as unknown as Options,
    );
  });
}

init();
