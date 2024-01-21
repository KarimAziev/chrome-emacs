import { EventEmitter } from 'events';

export interface ContentEventsBinder {
  bind(context: BaseHandler, window: Window): void;
}

export default class BaseHandler extends EventEmitter {
  protected document: Document;
  protected window: Window | null;
  protected elem: HTMLElement;

  constructor(elem: HTMLElement, contentEvents: ContentEventsBinder) {
    super();
    if (!elem.ownerDocument)
      throw new Error('The element must be within a document');
    this.document = elem.ownerDocument;
    this.window = this.document.defaultView;
    this.elem = elem;
    contentEvents.bind(this, this.window as Window);
  }

  load(): Promise<void> {
    return Promise.resolve();
  }

  setValue(value: string, options?: Record<string, unknown>): void {
    this.emit('valueSet', value, options || {});
  }

  getValue() {
    throw new Error('not implemented');
  }

  bindChange(f: (event: Event) => void): void {
    this.elem.addEventListener('keyup', f, false);
    this.elem.addEventListener('change', f, false);
  }

  unbindChange(f: (event: Event) => void): void {
    this.elem.removeEventListener('keyup', f, false);
    this.elem.removeEventListener('change', f, false);
  }
}
