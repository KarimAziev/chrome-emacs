import InjectorHandler from '@/handlers/injector';
import type { IContentEventsBinder } from '@/handlers/injector';
import type { UpdateTextPayload } from '@/handlers/types';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

/**
 * A handler for interacting with Monaco editor instances specifically.
 */
class MonacoHandler extends InjectorHandler {
  elem: HTMLTextAreaElement;
  /**
   * Constructs a new instance of the MonacoHandler.
   * @param elem - The HTMLTextAreaElement to be managed.
   * @param contentEvents - The content events binder for event management.
   */
  constructor(elem: HTMLTextAreaElement, contentEvents: IContentEventsBinder) {
    super(elem, contentEvents, 'monaco');
  }
  /**
   * Sets the value of the textarea and emits an input event, as well as forwarding
   * the value to the injected script through the parent class method.
   * @param value - The text value to set in the managed textarea.
   */
  setValue(value: string, options: UpdateTextPayload) {
    super.setValue(value, { ...options, triggerDOMEvent: false });
  }
  /**
   * Retrieves the current value from the textarea through the parent class method.
   * @returns A promise that resolves to the value of the textarea.
   */
  getValue() {
    const value = super.getValue();
    return Promise.resolve(value);
  }

  static getHintArea(elem: HTMLElement) {
    return elem.closest<HTMLElement>(VISUAL_ELEMENT_SELECTOR.monaco);
  }

  /**
   * Determines if the given element can be managed by this handler.
   * @param elem - The element to inspect.
   * @returns True if the handler can manage the element, otherwise false.
   */
  static canHandle(elem: HTMLTextAreaElement) {
    const enabled =
      elem.tagName?.toLowerCase() === 'textarea' &&
      elem.closest(VISUAL_ELEMENT_SELECTOR.monaco);

    return !!enabled;
  }

  static getName() {
    return 'monaco';
  }
}

export default MonacoHandler;
