import InjectorHandler from '@/handlers/injector';
import type { IContentEventsBinder } from '@/handlers/injector';
import { UpdateTextPayload } from '@/handlers/types';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

/**
 * Handler class for interfacing with CodeMirror version 6 editors through InjectorHandler.
 */
class CodeMirror6Handler extends InjectorHandler {
  /**
   * Constructs an instance of CodeMirror6Handler.
   * @param elem - The HTMLElement associated with the CodeMirror editor.
   * @param contentEvents - The IContentEventsBinder instance for binding content-related events.
   */
  constructor(elem: HTMLElement, contentEvents: IContentEventsBinder) {
    super(elem, contentEvents, 'codemirror6');
  }
  /**
   * Sets the value of the CodeMirror editor, optionally triggering a DOM event.
   * @param value - The value to set in the CodeMirror editor.
   * @param options - Options to customize the value setting, including whether to trigger DOM events.
   */
  setValue(value: string, options: UpdateTextPayload) {
    options = Object.assign({}, { triggerDOMEvent: false }, options);
    super.setValue(value, options);
  }

  /**
   * Retrieves the closest ancestor of the specified element that is a CodeMirror editor container.
   * @param elem - The HTMLElement from which to find the closest CodeMirror editor container.
   * @returns The closest HTMLElement that is a CodeMirror editor container, or null if none is found.
   */
  static getHintArea(elem: HTMLElement) {
    return elem.closest<HTMLElement>(VISUAL_ELEMENT_SELECTOR.cmEditor);
  }

  /**
   * Determines if the given HTMLElement can be handled by CodeMirror6Handler.
   * @param elem - The HTMLElement to check for compatibility with CodeMirror6Handler.
   * @returns True if the element can be handled by this handler, false otherwise.
   */

  static canHandle(elem: HTMLElement) {
    let res: null | HTMLElement = elem;

    while (res) {
      if (res.classList && res.classList.contains('cm-content')) {
        return true;
      }
      res = res.parentElement;
    }

    return false;
  }

  /**
   * Retrieves the name identifier for the CodeMirror6Handler.
   * @returns The name identifier of the handler.
   */
  static getName() {
    return 'codemirror6';
  }
}

export default CodeMirror6Handler;
