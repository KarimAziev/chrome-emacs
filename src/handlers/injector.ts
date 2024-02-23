import { v4 as uuidv4 } from 'uuid';
import BaseHandler from '@/handlers/base';
import {
  IContentEventsBinder,
  UpdateTextPayload,
  Options,
  PostToInjectedPayloadMap,
} from '@/handlers/types';

/**
 * A specialized handler extending BaseHandler for injecting and communicating with scripts.
 */
export default class InjectorHandler extends BaseHandler {
  private name: string;
  private uuid: string;
  private _getValueCallback: ((payload: UpdateTextPayload) => void) | null;

  /**
   * Creates an instance of InjectorHandler.
   * @param elem - The HTMLElement to be handled.
   * @param contentEvents - The content events binder instance for the handler.
   * @param name - Identifier name used in communications.
   */
  constructor(
    elem: HTMLElement,
    contentEvents: IContentEventsBinder,
    name: string,
  ) {
    super(elem, contentEvents);
    this.name = name;
    this.uuid = uuidv4();

    (this.window as Window).addEventListener(
      'message',
      (message: MessageEvent) => {
        // Ignores irrelevant messages.
        if (message.source !== this.window || message.data.uuid !== this.uuid) {
          return;
        }
        this.emit(message.data.type, message.data.payload);
      },
    );

    this._getValueCallback = null;
  }

  /**
   * Loads and initializes communication with the injected script.
   */

  async load() {
    this.injectScript(() =>
      this.postToInjected('initialize', { name: this.name }),
    );

    return await new Promise<Options>((resolve) => this.once('ready', resolve));
  }

  /**
   * Overwrites BaseHandler's setValue to include messages to the injected script.
   * @param value - The value to set.
   * @param options - Optional parameters.
   */
  setValue(value: string, options?: UpdateTextPayload): void {
    this.postToInjected('setValue', { text: value, ...options });
    super.setValue(value, options);
  }

  async getValue(): Promise<string> {
    this.postToInjected('getValue');

    return new Promise<string>((resolve, reject) => {
      if (this._getValueCallback) {
        this.removeListener('value', this._getValueCallback);
      }

      this._getValueCallback = (payload: UpdateTextPayload) => {
        if (typeof payload.text === 'string') {
          resolve(payload.text);
        } else {
          reject(
            new Error(
              'Payload does not contain a text property of type string',
            ),
          );
        }
        this._getValueCallback = null;
      };

      this.once('value', this._getValueCallback);
    });
  }

  /**
   * Injects a script element into the document.
   * @param onload - The callback to execute when the script loads.
   */
  private injectScript(onload?: () => void): void {
    if ((this.document as any).atomicScriptInjected) {
      if (onload) onload();
      return;
    }

    (this.document as any).atomicScriptInjected = true;
    this.executeInjectScript(onload);
  }

  /**
   * Actual method that creates and appends the script element.
   * @param onload - The callback to execute when the script has loaded.
   */
  private executeInjectScript(onload?: () => void): void {
    const s = this.document.createElement('script');
    s.src = chrome.runtime.getURL('scripts/injected.js');
    s.onload = function () {
      if ((this as any).parentNode) {
        (this as any).parentNode.removeChild(this);
      }

      if (onload) {
        onload();
      }
    };
    (this.document.head || this.document.documentElement).appendChild(s);
  }

  /**
   * Posts a message to the injected script.
   * @param type - The type of the message.
   * @param payload - The payload of the message.
   */
  private postToInjected<T extends keyof PostToInjectedPayloadMap>(
    type: T,
    payload?: PostToInjectedPayloadMap[T],
  ): void {
    const message = {
      type: type,
      uuid: this.uuid,
      payload: payload || {},
    };

    (this.window as Window).postMessage(
      message,
      (this.window as Window).location.origin,
    );
  }

  /**
   * Binds a change event listener.
   * @param f - The function to call when the change event occurs.
   */
  bindChange(f: (event: Event) => void): void {
    this.on('change', f);
  }
  /**
   * Unbinds a change event listener.
   * @param f - The function to remove from the event listener list.
   */
  unbindChange(f: (event: Event) => void): void {
    this.removeListener('change', f);
  }
}

export { IContentEventsBinder };
