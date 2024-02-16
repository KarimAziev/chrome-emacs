import { injectedHandlerFactory } from './handlers/injected';
import type { IInjectedHandler } from './handlers/injected/types';

const handlers: IInjectedHandler[] = [];

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

window.addEventListener('message', function (message: MessageEvent) {
  if (!message) {
    return;
  }
  if (!isSourceTrusted(message.source)) {
    return;
  }
  if (message.data.type === 'initialize') {
    const handlerName = message.data.payload.name;
    const Handler = injectedHandlerFactory.getHandler(handlerName);

    if (!Handler) {
      console.error(`Atomic Chrome received bad handler name: ${handlerName}`);
      return;
    }

    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      const handler = new Handler(activeElement, message.data.uuid);
      handler.setup().then(() => {
        handlers.push(handler);
        handler.postReady();
      });
    }
  } else {
    handlers.forEach((handler) => {
      handler.handleMessage(message.data);
    });
  }
});
