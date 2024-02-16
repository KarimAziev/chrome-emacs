export default class BaseInjectedHandler<Elem extends Element> {
  elem: Elem;
  uuid: string;
  silenced: boolean = false;

  constructor(elem: Elem, uuid: string) {
    this.elem = elem;
    this.uuid = uuid;
  }

  async setup(): Promise<void> {
    await this.load();
    this.bindChange(() => this.postToInjector('change'));
  }

  async load(): Promise<void> {}

  handleMessage(data: { type: string; uuid: string; payload: unknown }): void {
    if (data && data.type) {
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
  }

  onGetValue(): void {
    this.postToInjector('value', {
      text: this.getValue(),
    });
  }

  onSetValue(payload: { text: string }): void {
    this.setValue(payload.text);
  }

  getValue(): string {
    throw new Error('not implemented');
  }

  setValue(_value: string): void {
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
    const extension = this.getExtension();

    if (extension) {
      payload.extension = extension;
    }
    this.postToInjector('ready', payload);
  }

  getExtension(): string | string[] | null | void {}

  wrapSilence(f: (...args: unknown[]) => void): (...args: unknown[]) => void {
    return (...args) => {
      if (!this.silenced) {
        f(...args);
      }
    };
  }

  postToInjector(type: string, payload?: unknown): void {
    const message = {
      type: type,
      uuid: this.uuid,
      payload: payload || {},
    };
    window.postMessage(message, location.origin);
  }
}
