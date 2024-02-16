export interface Options {
  extension?: string | string[];
}

export interface IHandler {
  load(): Promise<void>;
  setValue(value: string, options?: Record<string, unknown>): void;
  getValue(): Promise<string>;
  bindChange(f: (event: Event) => void, useCapture?: boolean): void;
  unbindChange(f: (event: Event) => void, useCapture?: boolean): void;
}

export interface IHandlerConstructor {
  new (elem: Element, contentEvents: IContentEventsBinder): IHandler;
  canHandle(elem: Element): boolean;
}

export interface IContentEventsBinder {
  bind(context: IHandler, window: Window): void;
}
