import {
  IHandler,
  LoadedOptions,
  RegisterPayload,
  SocketPostPayloadMap,
  ClosedMessagePayload,
  MessageEventData,
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

// 5 seconds
const KEEP_ALIVE_INTERVAL = 5000;

const currentBrowser = process.env.BROWSER_TARGET;
const shouldStartKeepAlive = currentBrowser === 'firefox';

class TextSyncer {
  private keepAliveIntervalId: NodeJS.Timeout | null = null;
  /**
   * Starts the keep-alive procedure to maintain communication with the background script.
   *
   * This mechanism is specifically implemented because Firefox may terminate the service worker
   * and close the WebSocket connection if no events occur for 30 seconds, thereby disconnecting you.
   *
   * This mess is needed in Firefox due to their lack of support for keeping service workers alive with
   * WebSocket activity alone (unlike Chrome from version 116 onward).
   *
   * @param port The Chrome Extension's port for background communication.
   */
  private startKeepAliveLoop(port: chrome.runtime.Port): void {
    if (this.keepAliveIntervalId) {
      clearTimeout(this.keepAliveIntervalId);
    }

    this.keepAliveIntervalId = setTimeout(() => {
      try {
        this.post(port, 'keepalive');
        this.startKeepAliveLoop(port);
      } catch (error) {
        console.error('Failed to send keepalive message:', error);
        this.stopKeepAlive();
      }
    }, KEEP_ALIVE_INTERVAL);
  }

  /**
   * Stops the keep-alive procedure, ensuring that no further keep-alive messages are sent.
   */
  private stopKeepAlive(): void {
    if (this.keepAliveIntervalId) {
      clearInterval(this.keepAliveIntervalId);
      this.keepAliveIntervalId = null;
    }
  }

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

    port.onMessage.addListener(this.makeMessageListener(handler, port));

    const textChangeListener = this.makeTextChangeListener(port, handler);

    if (shouldStartKeepAlive) {
      this.startKeepAliveLoop(port);
    }

    handler.bindChange(textChangeListener, false);
    port.onDisconnect.addListener(() => {
      this.stopKeepAlive();
      handler.unbindChange(textChangeListener, false);
    });
  }

  /**
   * Creates a message listener callback that processes incoming messages and calls
   * corresponding methods on the TextSyncer instance.
   * @param handler - The handler instance managing the text element.
   * @returns A function to be used as the onMessage event listener.
   */
  private makeMessageListener(handler: IHandler, port: chrome.runtime.Port) {
    return (msg: MessageEventData) => {
      if (shouldStartKeepAlive) {
        this.startKeepAliveLoop(port);
      }

      if (this[msg.type]) {
        return this[msg.type](handler, msg.payload);
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
    payload?: SocketPostPayloadMap[T],
  ) {
    return port.postMessage({ type, payload });
  }
}

export default new TextSyncer();
