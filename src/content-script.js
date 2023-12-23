import { handlerFactory } from './handlers';
import {
  textSyncer,
  contentEvents,
  elementNormalizer,
} from './content-script-tools';

let lastNode;
let styleBackup;
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
function highlightElement(node) {
  cleanupHighlight();
  if (!node) {
    return;
  }

  lastNode = typeof node.getAttribute === 'function' ? node : null;
  styleBackup = lastNode.getAttribute('style');

  if (lastNode) {
    let styles = styleBackup
      ? `outline: 1px dashed red; ${styleBackup}`
      : 'outline: 1px dashed red';
    lastNode.setAttribute('style', styles);
    lastNode.scrollIntoViewIfNeeded();
  }
}

function findTextAreas() {
  textareas = document.getElementsByTagName('textarea');
  if (textareas) {
    for (let idx = 0; idx < textareas.length; idx++) {
      const el = textareas[idx];
      el.addEventListener('focusin', (event) => {
        highlightElement(event.target);
      });
      el.addEventListener('focusout', (_event) => {
        highlightElement();
      });
    }
  }
  return textareas;
}

function getHandler(elem) {
  if (!elem) {
    return;
  }
  const activeElement = elementNormalizer.normalize(elem);
  const Handler = handlerFactory.handlerFor(activeElement);
  if (!Handler && activeElement && activeElement.tagName) {
    const elemName = activeElement.tagName.toLowerCase();
    console.log('elemName:', elemName);
    console.error(`Atomic Chrome does not support <${elemName}> (yet?)`);
    return;
  }

  return new Handler(activeElement, contentEvents);
}

function init() {
  let el = document.activeElement;
  let handler = getHandler(el);

  if (!handler) {
    const textAreas = findTextAreas();
    let elem = textAreas && textAreas[0];

    if (elem && elem.focus) {
      elem.focus();
    }
    handler = getHandler(elem);
  }

  if (handler) {
    handler.load().then((options) => {
      textSyncer.linkElem(document.URL, document.title, handler, options);
    });
  }
}

init();
