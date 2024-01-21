export default class BaseInjectedHandler {
  elem: HTMLElement;
  uuid: string;
  silenced: boolean = false;

  constructor(elem: HTMLElement, uuid: string) {
    this.elem = elem;
    this.uuid = uuid;
  }

  async setup(): Promise<void> {
    return this.load().then((res: void) => {
      this.bindChange(() => this.postToInjector('change'));
      return res;
    });
  }

  load(): Promise<void> {
    return Promise.resolve();
  }

  handleMessage(data: { type: string; uuid: string; payload: any }): void {
    const methodName = `on${
      data.type.charAt(0).toUpperCase() + data.type.slice(1)
    }` as keyof this;
    if (
      data.uuid === this.uuid &&
      typeof (this as any)[methodName] === 'function'
    ) {
      (this as any)[methodName](data.payload);
    }
  }

  onGetValue(): void {
    this.postToInjector('value', { text: this.getValue() });
  }

  onSetValue(payload: { text: string }): void {
    this.setValue(payload.text);
  }

  getValue(): string {
    throw new Error('not implemented');
  }

  setValue(_arg: string): void {
    throw new Error('not implemented');
  }

  bindChange(_handler: () => void): void {
    throw new Error('not implemented');
  }

  executeSilenced(f: () => void): void {
    this.silenced = true;
    f();
    this.silenced = false;
  }

  postReady(): void {
    const payload: any = {};
    const extension: null | void | string | string[] = this.getExtension();
    if (extension as unknown as string) {
      payload.extension = extension;
    }
    this.postToInjector('ready', payload);
  }

  getExtension() {}

  wrapSilence(f: (...args: any[]) => void): (...args: any[]) => void {
    return (...args) => {
      if (!this.silenced) {
        f(...args);
      }
    };
  }

  postToInjector(type: string, payload?: any): void {
    const message = {
      type: type,
      uuid: this.uuid,
      payload: payload || {},
    };
    window.postMessage(message, location.origin);
  }
}
