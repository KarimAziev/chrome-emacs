import { EventEmitter } from 'events';
import { IHandler, IContentEventsBinder } from './types';

export default class BaseHandler extends EventEmitter implements IHandler {
  protected document: Document;
  protected window: Window | null;
  protected elem: HTMLElement;

  constructor(elem: HTMLElement, contentEvents: IContentEventsBinder) {
    super();
    if (!elem.ownerDocument) {
      throw new Error('The element must be within a document');
    }
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

  // Ensure this method is declared to return a Promise<string> to match the IHandler interface
  getValue(): Promise<string> {
    // Placeholder implementation, should be overridden in subclasses
    // This ensures the method signature matches the IHandler interface
    return Promise.reject('Method not implemented.');
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
