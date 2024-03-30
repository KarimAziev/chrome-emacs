import BaseHandler from '@/handlers/base';
import { CustomEventDispatcher } from '@/util/event-dispatcher';
import { UpdateTextPayload, LoadedOptions } from '@/handlers/types';
import { estimateParent, setSelectionRange } from '@/util/dom';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

class TextareaHandler extends BaseHandler {
  elem: HTMLTextAreaElement;
  dispatcher!: CustomEventDispatcher<HTMLTextAreaElement>;
  /**
   * Sets a value to the textarea element and dispatches an 'input' event.
   * @param value - The value to set on the textarea.
   */

  setValue(value: string, options?: UpdateTextPayload) {
    this.dispatcher.beforeinput();

    this.elem.value = value;
    super.setValue(value, options);

    this.elem.focus();
    this.dispatcher.input();

    this.setSelection(options?.selections);

    this.dispatcher.keydown();
    this.dispatcher.keypress();
    this.dispatcher.keyup();

    this.dispatcher.change();
  }

  private setSelection(selections: UpdateTextPayload['selections']) {
    if (!Array.isArray(selections) || !selections[0]) {
      return;
    }
    const { start, end } = selections[0];
    setSelectionRange(this.elem, start, end);

    if (start === end) {
      this.elem.selectionEnd = this.elem.selectionEnd + 1;
    }
  }

  getPosition() {
    const text = this.elem.value;
    const cursorPos = this.elem.selectionStart;
    const line = text.substring(0, cursorPos).split('\n');
    const lineNumber = line.length;
    const column = line[line.length - 1].length + 1;

    return { lineNumber, column };
  }

  /**
   * Retrieves the current value from the textarea element.
   * @returns A promise resolved with the current value of the textarea.
   */
  getValue() {
    const position = this.getPosition();
    return Promise.resolve({ ...position, text: this.elem.value });
  }

  getVisualElement(): Element | HTMLElement | null {
    return estimateParent(this.elem);
  }

  load(): Promise<LoadedOptions> {
    this.dispatcher = new CustomEventDispatcher(this.elem);
    const parentEl = this.getVisualElement();
    const rect = parentEl?.getBoundingClientRect();
    const screenY = window.screenY;

    const position = this.getPosition();
    const payload = {
      ...position,
      rect,
    };
    if (payload?.rect) {
      payload.rect.y = (rect?.y || 0) + screenY;
      payload.rect.x = (rect?.x || 0) + window.screenX;
    }

    return Promise.resolve(payload);
  }

  static getHintArea(elem: HTMLElement) {
    return estimateParent(elem);
  }

  /**
   * Static method to check if the handler can manage the given element.
   * @param elem - The element to check.
   * @returns A boolean indicating if the handler can manage the given element.
   */
  static canHandle(elem: HTMLTextAreaElement) {
    if (!elem.tagName) {
      return false;
    }
    return (
      elem.tagName.toLowerCase() === 'textarea' &&
      !Object.values(VISUAL_ELEMENT_SELECTOR).some((v) => elem.closest(v))
    );
  }

  static getName() {
    return 'textarea';
  }
}

export default TextareaHandler;
