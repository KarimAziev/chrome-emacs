import InjectorHandler from '@/handlers/injector';
import type { IContentEventsBinder } from '@/handlers/injector';
import { UpdateTextPayload } from '@/handlers/types';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

/**
 * Handler class for interfacing with CKEditor5 editors through InjectorHandler.
 */
class CKEditor5Handler extends InjectorHandler {
  /**
   * Constructs an instance of CKEditor5Handler.
   * @param elem - The HTMLElement associated with the CKEditor editor.
   * @param contentEvents - The IContentEventsBinder instance for binding content-related events.
   */
  constructor(elem: HTMLElement, contentEvents: IContentEventsBinder) {
    super(elem, contentEvents, 'ckeditor5');
  }

  /**
   * Sets the value of the CKEditor editor, optionally triggering a DOM event.
   * @param value - The value to set in the CKEditor editor.
   * @param options - Options to customize the value setting, including whether to trigger DOM events.
   */
  setValue(value: string, options: UpdateTextPayload) {
    options = Object.assign({}, { triggerDOMEvent: false }, options);
    super.setValue(value, options);
  }

  /**
   * Retrieves the closest ancestor of the specified element that is a CKEditor editor container.
   * @param elem - The HTMLElement from which to find the closest CKEditor5 editor container.
   * @returns The closest HTMLElement that is a CKEditor5 editor container, or null if none is found.
   */
  static getHintArea(elem: HTMLElement): HTMLElement | null {
    return elem;
  }

  /**
   * Determines if the given HTMLElement can be handled by CKEditor5Handler.
   * @param elem - The HTMLElement to check for compatibility with CKEditor5Handler.
   * @returns True if the element can be handled by this handler, false otherwise.
   */
  static canHandle(elem: HTMLElement): boolean {
    const selector = VISUAL_ELEMENT_SELECTOR.ckeditor5.substring(1);
    if (
      elem.classList.contains(selector) &&
      !elem.classList.contains('ck-editor__nested-editable')
    ) {
      return true;
    }
    return false;
  }

  /**
   * Retrieves the name identifier for the CKEditor5Handler.
   * @returns The name identifier of the handler.
   */
  static getName(): string {
    return 'ckeditor5';
  }
}

export default CKEditor5Handler;
