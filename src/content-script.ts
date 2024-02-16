import {
  contentEvents,
  elementNormalizer,
  textSyncer,
} from './content-script-tools';
import { handlerFactory } from './handlers';
import { IHandler, Options } from './handlers/types';
import { findAndFocusBiggestTextArea } from './util/dom';

function getHandler(elem: Element | null) {
  if (!elem) {
    return;
  }

  const activeElement = elementNormalizer.normalize(elem);

  const Handler = handlerFactory.handlerFor(activeElement);

  if (!Handler && activeElement && activeElement.tagName) {
    const elemName = activeElement.tagName.toLowerCase();
    console.error(`Atomic Chrome does not support <${elemName}> (yet?)`);
    return;
  }

  return Handler ? new Handler(activeElement, contentEvents) : null;
}

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
