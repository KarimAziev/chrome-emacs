import { injectedHandlerFactory } from './handlers/injected';
import type { HandlerClass } from './handlers/injected/factory';

const handlers: HandlerClass[] = [];

function isSourceTrusted(source: MessageEvent['source']) {
  let win;
  for (win = window; win !== window.parent; win = window.parent) {
    if (source === window) {
      return true;
    }
  }
  return win === source;
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
    const handler = new Handler(document.activeElement, message.data.uuid);
    handler.setup().then(() => {
      handlers.push(handler);
      handler.postReady();
    });
  } else {
    for (const handler of handlers) {
      (handler as any).handleMessage(message.data);
    }
  }
});
