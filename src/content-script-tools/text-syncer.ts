import type { IHandler, Options, UpdateTextPayload } from '@/handlers/types';

const NORMAL_CLOSE_CODE = 1000;

class TextSyncer {
  /**
   * Establishes a connection between the content script and background script,
   * and sets up listeners for text updates and disconnect events.
   * @param url - The URL of the current page.
   * @param title - The title of the current page.
   * @param handler - The handler instance managing the text element.
   * @param options - Additional options for text synchronization.
   */
  linkElem(url: string, title: string, handler: IHandler, options?: Options) {
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
  makeMessageListener(handler: IHandler) {
    return (msg: any) => {
      if ((this as any)[msg.type]) {
        return (this as any)[msg.type](handler, msg.payload);
      }
      console.warn('Chrome Emacs received unknown message:', msg);
    };
  }
  /**
   * Updates the handler's managed text based on the received payload.
   * @param handler - The handler instance managing the text element.
   * @param payload - The payload containing the updated text.
   */
  updateText(handler: IHandler, payload: UpdateTextPayload) {
    if (handler.setValue) {
      handler.setValue(payload.text, payload);
    }
  }

  /**
   * Logs a warning if the WebSocket connection is closed with a non-normal close code.
   * @param _handler - The handler instance.
   * @param payload - The payload containing the close code and reason.
   */
  closed(_handler: any, payload: { code: number; reason: string }) {
    const code = payload.code;
    if (code !== NORMAL_CLOSE_CODE) {
      console.warn(`Chrome Emacs connection was closed with code ${code}`);
    }
  }
  /**
   * Creates a change listener callback that sends updated text to the background script.
   * @param port - The open port to the background script.
   * @param handler - The handler instance managing the text element.
   * @returns A function to be used as a change listener.
   */
  makeTextChangeListener(port: chrome.runtime.Port, handler: IHandler) {
    return () => {
      handler.getValue().then((text: string) => {
        this.post(port, 'updateText', { text: text });
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
  register(
    port: chrome.runtime.Port,
    url: string,
    title: string,
    handler: IHandler,
    options?: Options,
  ) {
    options = options || {};

    handler.getValue().then((text: string) => {
      const payload: any = { url: url, title: title, text: text };

      let extension = options?.extension;

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
  post(port: chrome.runtime.Port, type: string, payload: any) {
    return port.postMessage({ type: type, payload: payload });
  }
}

export default new TextSyncer();
