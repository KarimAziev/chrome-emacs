import InjectorHandler from '@/handlers/injector';
import type { IContentEventsBinder } from '@/handlers/injector';

/**
 * Handler class for interfacing with CodeMirror editors through InjectorHandler.
 */
class CodeMirrorHandler extends InjectorHandler {
  /**
   * Constructs an instance of CodeMirrorHandler.
   * @param elem - The HTMLElement associated with the CodeMirror editor.
   * @param contentEvents - The IContentEventsBinder instance for binding content-related events.
   */
  constructor(elem: HTMLElement, contentEvents: IContentEventsBinder) {
    super(elem, contentEvents, 'codemirror');
  }
  /**
   * Sets the value of the CodeMirror editor, optionally triggering a DOM event.
   * @param value - The value to set in the CodeMirror editor.
   * @param options - Options to customize the value setting, including whether to trigger DOM events.
   */
  setValue(value: string, options: any) {
    options = Object.assign({}, { triggerDOMEvent: false }, options);
    super.setValue(value, options);
  }

  /**
   * Determines if the given HTMLElement can be handled by CodeMirrorHandler.
   * @param elem - The HTMLElement to check for compatibility with CodeMirrorHandler.
   * @returns True if the element can be handled by this handler, false otherwise.
   */

  static canHandle(elem: HTMLElement) {
    let res: null | HTMLElement = elem;
    while (res) {
      if (res.classList && res.classList.contains('CodeMirror')) {
        return true;
      }
      res = res.parentElement;
    }
    return false;
  }
}

export default CodeMirrorHandler;
