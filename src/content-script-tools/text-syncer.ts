import type { IHandler, Options } from '@/handlers/types';

const NORMAL_CLOSE_CODE = 1000;

class TextSyncer {
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

  makeMessageListener(handler: IHandler) {
    return (msg: any) => {
      if ((this as any)[msg.type]) {
        return (this as any)[msg.type](handler, msg.payload);
      }
      console.warn('Atomic Chrome received unknown message:', msg);
    };
  }

  updateText(handler: IHandler, payload: { text: string }) {
    if (handler.setValue) {
      handler.setValue(payload.text);
    }
  }

  closed(_handler: any, payload: { code: number; reason: string }) {
    const code = payload.code;
    if (code !== NORMAL_CLOSE_CODE) {
      console.warn(`Atomic Chrome connection was closed with code ${code}`);
    }
  }

  makeTextChangeListener(port: chrome.runtime.Port, handler: IHandler) {
    return () => {
      handler.getValue().then((text: string) => {
        this.post(port, 'updateText', { text: text });
      });
    };
  }

  register(
    port: chrome.runtime.Port,
    url: string,
    title: string,
    handler: IHandler,
    options?: { extension?: string | string[] },
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

  post(port: chrome.runtime.Port, type: string, payload: any) {
    return port.postMessage({ type: type, payload: payload });
  }
}

export default new TextSyncer();
