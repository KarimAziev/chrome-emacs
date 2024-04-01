import { injectedHandlerFactory } from '@/handlers/injected';
import type { IInjectedHandler } from '@/handlers/injected/types';

const handlers: IInjectedHandler[] = [];

/**
 * Determines if the source of a message is trusted by comparing it to the current and parent windows.
 * @param source - The source window of the incoming message.
 * @returns A boolean indicating if the source is trusted.
 */
function isSourceTrusted(source: MessageEvent['source']): boolean {
  let win: Window | null = window;
  while (win && win !== window.parent) {
    if (source === win) {
      return true;
    }
    win = win.parent;
  }
  return source === win;
}

/**
 * Adds a listener to the window object that responds to message events.
 * It filters messages based on their source and type, and creates handlers accordingly.
 */
window.addEventListener('message', function (message: MessageEvent) {
  if (!message) {
    return;
  }

  if (!isSourceTrusted(message.source)) {
    return;
  }

  if (message.data.type === 'initialize') {
    const handlerName = message.data.payload.name;
    const selector: string = message.data.payload.selector;

    const selectorEl = selector ? this.document.querySelector(selector) : null;

    const handlerElem = selectorEl || this.document.activeElement;
    const Handler = injectedHandlerFactory.getHandler(handlerName);

    if (!Handler) {
      console.error(`Chrome Emacs received bad handler name: ${handlerName}`);
      return;
    }
    if (handlerElem) {
      Handler.make(handlerElem as HTMLElement, message.data.uuid).then(
        (handler) =>
          handler.setup().then(() => {
            handlers.push(handler);
            handler.postReady();
          }),
      );
    }
  } else {
    handlers.forEach((handler) => {
      handler.handleMessage(message.data);
    });
  }
});
