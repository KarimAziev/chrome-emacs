import InjectorHandler from '@/handlers/injector';
import { UpdateTextPayload } from '@/handlers/types';
import type { IContentEventsBinder } from '@/handlers/injector';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

/**
 * Handler class for interfacing with CodeMirror version 5 editors through InjectorHandler.
 */
class CodeMirror5Handler extends InjectorHandler {
  /**
   * Constructs an instance of CodeMirror5Handler.
   * @param elem - The HTMLElement associated with the CodeMirror editor.
   * @param contentEvents - The IContentEventsBinder instance for binding content-related events.
   */
  constructor(elem: HTMLElement, contentEvents: IContentEventsBinder) {
    super(elem, contentEvents, 'codemirror5');
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
   * Determines if the given HTMLElement can be handled by CodeMirror5Handler.
   * @param elem - The HTMLElement to check for compatibility with CodeMirror5Handler.
   * @returns True if the element can be handled by this handler, false otherwise.
   */

  static getParentElement(elem: HTMLElement) {
    return elem.closest<HTMLElement>(VISUAL_ELEMENT_SELECTOR.codeMirror5);
  }

  static getHintArea(elem: HTMLElement) {
    const parent = CodeMirror5Handler.getParentElement(elem);
    return parent;
  }

  static canHandle(elem: HTMLElement) {
    return !!CodeMirror5Handler.getParentElement(elem);
  }

  static getName() {
    return 'codemirror5';
  }
}

export default CodeMirror5Handler;
