import InjectorHandler from '@/handlers/injector';
import type { IContentEventsBinder } from '@/handlers/injector';
import { UpdateTextPayload } from '@/handlers/types';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

/**
 * Handler class for interfacing with CKEditor4 editors through InjectorHandler.
 */
class CKEditor4Handler extends InjectorHandler {
  /**
   * Constructs an instance of CKEditor4Handler.
   * @param elem - The HTMLElement associated with the CKEditor editor.
   * @param contentEvents - The IContentEventsBinder instance for binding content-related events.
   */
  constructor(elem: HTMLElement, contentEvents: IContentEventsBinder) {
    super(elem, contentEvents, 'ckeditor4');
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
   * @param elem - The HTMLElement from which to find the closest CKEditor4 editor container.
   * @returns The closest HTMLElement that is a CKEditor4 editor container, or null if none is found.
   */
  static getHintArea(elem: HTMLElement): HTMLElement | null {
    return elem.closest<HTMLElement>(
      VISUAL_ELEMENT_SELECTOR.ckeditorContainer4,
    );
  }

  /**
   * Determines if the given HTMLElement can be handled by CKEditor4Handler.
   * @param elem - The HTMLElement to check for compatibility with CKEditor4Handler.
   * @returns True if the element can be handled by this handler, false otherwise.
   */
  static canHandle(elem: HTMLElement): boolean {
    let res: null | HTMLElement = elem;
    while (res) {
      // CKEditor4's editable area typically has the class `cke_editable`
      if (res.classList && res.classList.contains('cke_contents')) {
        return true;
      }
      res = res.parentElement;
    }

    return false;
  }

  /**
   * Retrieves the name identifier for the CKEditor4Handler.
   * @returns The name identifier of the handler.
   */
  static getName(): string {
    return 'ckeditor4';
  }

  get editorInstance(): CKEDITOR.editor | null {
    const instanceId = this.elem.getAttribute('id');
    if (instanceId && window['CKEDITOR'] && window['CKEDITOR'].instances) {
      return window['CKEDITOR'].instances[instanceId];
    }
    return null;
  }
}

export default CKEditor4Handler;
