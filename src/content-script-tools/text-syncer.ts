import {
  IHandler,
  LoadedOptions,
  RegisterPayload,
  SocketPostPayloadMap,
  ClosedMessagePayload,
  MessageEventData,
  MessageClickData,
} from '@/handlers/types';
import { messager } from '@/content-script-tools/message';
import { WS_URL } from '@/background-tools/ws-bridge';
import { normalizeRect } from '@/util/dom';
import { CustomEventDispatcher } from '@/util/event-dispatcher';

const errorMessageByCode: {
  [key: ClosedMessagePayload['code']]: Parameters<typeof messager.error>[0];
} = {
  1006: `Failed to connect to server: <i>${WS_URL}</i>`,
};

class TextSyncer {
  /**
   * Establishes a connection between the content script and background script,
   * and sets up listeners for text updates and disconnect events.
   * @param url - The URL of the current page.
   * @param title - The title of the current page.
   * @param handler - The handler instance managing the text element.
   * @param options - Additional options for text synchronization.
   */
  public linkElem(
    url: string,
    title: string,
    handler: IHandler,
    options?: LoadedOptions,
  ) {
    const port = chrome.runtime.connect();

    this.register(port, url, title, handler, options);

    port.onMessage.addListener(this.makeMessageListener(handler));
    const textChangeListener = this.makeTextChangeListener(port, handler);
    handler.bindChange(textChangeListener, false);
    port.onDisconnect.addListener(() => {
      handler.unbindChange(textChangeListener, false);
    });
  }

  /**
   * Creates a message listener callback that processes incoming messages and calls
   * corresponding methods on the TextSyncer instance.
   * @param handler - The handler instance managing the text element.
   * @returns A function to be used as the onMessage event listener.
   */
  private makeMessageListener(handler: IHandler) {
    return (msg: MessageEventData | MessageClickData) => {
      if (this[msg.type]) {
        return this[msg.type](handler, msg.payload as any);
      }
      console.warn('Chrome Emacs received unknown message:', msg);
    };
  }
  /**
   * Updates the handler's managed text based on the received payload.
   * @param handler - The handler instance managing the text element.
   * @param payload - The payload containing the updated text.
   */

  updateText(handler: IHandler, payload: MessageEventData['payload']) {
    if (handler.setValue) {
      handler.setValue(payload.text, payload);
    }
  }

  /**
   * Simulates a click event on a target element specified by provided CSS
     selectors and optional inner text criteria. If a matching element is found,
     a custom click event is dispatched; otherwise, an error message is
     reported.
   * @param handler - The handler instance managing the text element.
   * @param payload - The payload containing CSS selector(s) and/or inner text(s).
   */

  async clickElement(_handler: IHandler, payload: MessageClickData['payload']) {
    try {
      await chrome.runtime.sendMessage({
        type: 'simulate-click',
        payload: {
          selector: payload.selector,
          innerText: payload.innerText,
        },
      });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        messager.error(error.message, { title: 'Chrome Emacs: ' });
      }
    }
  }

  /**
   * Logs a warning if the WebSocket connection is closed with a non-normal close code.
   * @param _handler - The handler instance.
   * @param payload - The payload containing the close code and reason.
   */
  closed(_handler: any, payload: ClosedMessagePayload) {
    const msg = errorMessageByCode[payload.code];

    if (msg) {
      console.log('Chrome Emacs: ', payload);
      messager.error(msg, { title: 'Chrome Emacs: ' });
    }
  }
  /**
   * Creates a change listener callback that sends updated text to the background script.
   * @param port - The open port to the background script.
   * @param handler - The handler instance managing the text element.
   * @returns A function to be used as a change listener.
   */
  private makeTextChangeListener(
    port: chrome.runtime.Port,
    handler: IHandler,
  ): Parameters<IHandler['bindChange']>[0] {
    return (event) => {
      if (CustomEventDispatcher.isAtomicChromeCustomEvent(event)) {
        return;
      }

      handler.getValue().then((data) => {
        this.post(port, 'updateText', data);
      });
    };
  }
  /**
   * Registers the current tab with the background script by sending initial text data.
   * @param port - The open port to the background script.
   * @param url - The URL of the current page.
   * @param title - The title of the current page.
   * @param handler - The handler instance managing the text element.
   * @param options - Additional options for the registration.
   */
  private register(
    port: chrome.runtime.Port,
    url: string,
    title: string,
    handler: IHandler,
    options?: LoadedOptions,
  ) {
    options = options || {};

    handler.getValue().then((data) => {
      const payload: RegisterPayload = {
        ...options,
        ...data,
        url: url,
        title: title,
        text: data.text,
        rect: normalizeRect(options?.rect),
      };

      const extension = options?.extension;

      if (extension) {
        const normalizeExtension = (ext: string) =>
          ext && ext[0] !== '.' ? `.${ext}` : ext;

        payload.extension = Array.isArray(extension)
          ? extension.map(normalizeExtension)
          : normalizeExtension(extension);
      }

      this.post(port, 'register', payload);
    });
  }

  /**
   * Sends a message with a specific type and payload to the background script via the port.
   * @param port - The open port to the background script.
   * @param type - The type of the message.
   * @param payload - The payload of the message.
   */
  private post<T extends keyof SocketPostPayloadMap>(
    port: chrome.runtime.Port,
    type: T,
    payload: SocketPostPayloadMap[T],
  ) {
    return port.postMessage({ type, payload });
  }
}

export default new TextSyncer();
