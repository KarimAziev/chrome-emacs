import { handlerFactory } from './handlers';
import {
  textSyncer,
  contentEvents,
  elementNormalizer,
} from './content-script-tools';

import type { HandlerConstructor } from './handlers/factory';

let lastNode: Element | null;
let styleBackup: string | null;
let textareas;

function cleanupHighlight() {
  if (lastNode) {
    lastNode.removeAttribute('style');
    if (styleBackup) {
      lastNode.setAttribute('style', styleBackup);
    }
    lastNode = null;
    styleBackup = null;
  }
}
function highlightElement(node: Element) {
  cleanupHighlight();
  if (!node) {
    return;
  }

  lastNode = typeof node.getAttribute === 'function' ? node : null;

  if (lastNode) {
    styleBackup = lastNode.getAttribute('style');
    let styles = styleBackup
      ? `outline: 1px dashed red; ${styleBackup}`
      : 'outline: 1px dashed red';
    lastNode.setAttribute('style', styles);
    lastNode.scrollIntoView();
  }
}

function findTextAreas() {
  textareas = document.getElementsByTagName('textarea');
  if (textareas) {
    for (let idx = 0; idx < textareas.length; idx++) {
      const el = textareas[idx];
      el.addEventListener('focusin', function () {
        highlightElement(this);
      });
      el.addEventListener('focusout', (_event) => {
        cleanupHighlight();
      });
    }
  }
  return textareas;
}

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
  if (Handler) {
    return new Handler(activeElement, contentEvents);
  }
}

function init() {
  let el = document.activeElement;

  let handler: HandlerConstructor = getHandler(el);

  if (!handler) {
    const textAreas = findTextAreas();
    let elem = textAreas && textAreas[0];

    if (elem && elem.focus) {
      elem.focus();
    }
    handler = getHandler(elem);
  }

  if (handler && handler.load) {
    handler.load().then((options: { extension?: string | string[] }) => {
      textSyncer.linkElem(document.URL, document.title, handler, options);
    });
  }
}

init();
