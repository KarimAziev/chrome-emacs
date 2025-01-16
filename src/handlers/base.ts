import { EventEmitter } from 'events';
import {
  IHandler,
  IContentEventsBinder,
  UpdateTextPayload,
  LoadedOptions,
  ValueSetEmitOptions,
  CustomDocument,
} from '@/handlers/types';

/**
 * Base handler class implementing `IHandler` interface.
 */
export default class BaseHandler<Elem extends HTMLElement = HTMLElement>
  extends EventEmitter
  implements IHandler
{
  public document: CustomDocument;
  public window: Window;
  elem: Elem;

  /**
   * Constructs a new BaseHandler instance.
   * @param elem - The HTMLElement to be handled.
   * @param contentEvents - The content events binder instance.
   */
  constructor(elem: Elem, contentEvents: IContentEventsBinder) {
    super();
    if (!elem.ownerDocument) {
      throw new Error('The element must be within a document');
    }
    this.document = elem.ownerDocument;
    this.window = this.document.defaultView as NonNullable<
      typeof this.document.defaultView
    >;
    this.elem = elem;
    contentEvents.bind(this, this.window as Window);
  }

  /**
   * Handler initialization or data loading.
   */
  load(): Promise<LoadedOptions> {
    return Promise.resolve({});
  }

  /**
   * Sets a value for the handler.
   * @param value - The value to set.
   * @param options - Optional parameters.
   */
  setValue(value: string, options?: ValueSetEmitOptions): void {
    this.emit('valueSet', value, options || {});
  }

  /**
   * Retrieves the current value.
   * @returns A promise that is rejected as method is not implemented.
   */
  getValue(): Promise<UpdateTextPayload> {
    return Promise.reject('Method not implemented.');
  }
  /**
   * Binds change event listeners to the element.
   * @param f - The function to be called on change events.
   */
  bindChange(f: (event: Event) => void): void {
    this.elem.addEventListener('keyup', f, false);
    this.elem.addEventListener('change', f, false);
  }
  /**
   * Unbinds change event listeners from the element.
   * @param f - The function to be removed from the event listeners.
   */
  unbindChange(f: (event: Event) => void): void {
    this.elem.removeEventListener('keyup', f, false);
    this.elem.removeEventListener('change', f, false);
  }
}
