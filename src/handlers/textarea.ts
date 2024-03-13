import BaseHandler from '@/handlers/base';
import { UpdateTextPayload, LoadedOptions } from '@/handlers/types';
import { estimateParent, setSelectionRange } from '@/util/dom';

class TextareaHandler extends BaseHandler {
  elem: HTMLTextAreaElement;
  /**
   * Sets a value to the textarea element and dispatches an 'input' event.
   * @param value - The value to set on the textarea.
   */
  setValue(value: string, options?: UpdateTextPayload) {
    this.elem.value = value;

    const event = new Event('input', {
      bubbles: true,
      cancelable: true,
    });

    super.setValue(value, options);
    this.elem.dispatchEvent(event);

    this.setSelection(options?.selections);
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

  /**
   * Static method to check if the handler can manage the given element.
   * @param elem - The element to check.
   * @returns A boolean indicating if the handler can manage the given element.
   */
  static canHandle(elem: HTMLTextAreaElement) {
    if (!elem.tagName) {
      return false;
    }
    return elem.tagName.toLowerCase() === 'textarea';
  }
}

export default TextareaHandler;
