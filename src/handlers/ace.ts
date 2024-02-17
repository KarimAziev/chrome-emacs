import InjectorHandler from '@/handlers/injector';
import type { IContentEventsBinder } from '@/handlers/injector';

const aceClassName = 'ace_text-input';
/**
 * Handler specifically designed for interacting with Ace editor instances.
 */
class AceHandler extends InjectorHandler {
  /**
   * Constructs a new AceHandler instance.
   * @param elem - The HTMLElement to be handled, expected to be part of Ace editor.
   * @param contentEvents - The content events binder instance.
   */
  constructor(elem: HTMLElement, contentEvents: IContentEventsBinder) {
    super(elem, contentEvents, 'ace');
  }
  /**
   * Determines if the handler can manage the provided element, specifically for Ace editor elements.
   * @param elem - The element to check.
   * @returns A boolean indicating if the element is an Ace editor that can be handled.
   */
  static canHandle(elem: HTMLElement): boolean {
    return elem.classList.contains(aceClassName);
  }
}

export default AceHandler;
