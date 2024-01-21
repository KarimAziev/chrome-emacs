import { v4 as uuidv4 } from 'uuid';
import BaseHandler from './base';

export interface ContentEventsBinder {
  bind(context: BaseHandler, window: Window): void;
}

export default class InjectorHandler extends BaseHandler {
  private name: string;
  private uuid: string;
  private _getValueCallback: ((payload: any) => void) | null;

  constructor(
    elem: HTMLElement,
    contentEvents: ContentEventsBinder,
    name: string,
  ) {
    super(elem, contentEvents);
    this.name = name;
    this.uuid = uuidv4();

    (this.window as Window).addEventListener(
      'message',
      (message: MessageEvent) => {
        if (message.source !== this.window || message.data.uuid !== this.uuid) {
          return;
        }
        this.emit(message.data.type, message.data.payload);
      },
    );

    this._getValueCallback = null;
  }

  async load(): Promise<void> {
    this.injectScript(() =>
      this.postToInjected('initialize', { name: this.name }),
    );

    await new Promise((resolve) => this.once('ready', resolve));
  }

  setValue(value: string, options?: Record<string, unknown>): void {
    this.postToInjected('setValue', { text: value });
    super.setValue(value, options);
  }

  async getValue() {
    this.postToInjected('getValue');

    return new Promise((resolve) => {
      if (this._getValueCallback) {
        this.removeListener('value', this._getValueCallback);
      }

      this._getValueCallback = (payload: any) => {
        resolve(payload.text);
        this._getValueCallback = null;
      };

      this.once('value', this._getValueCallback);
    });
  }

  private injectScript(onload?: () => void): void {
    if ((this.document as any).atomicScriptInjected) {
      if (onload) onload();
      return;
    }

    (this.document as any).atomicScriptInjected = true;
    this.executeInjectScript(onload);
  }

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

  private postToInjected(type: string, payload?: Record<string, any>): void {
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

  bindChange(f: (event: Event) => void): void {
    this.on('change', f);
  }

  unbindChange(f: (event: Event) => void): void {
    this.removeListener('change', f);
  }
}
