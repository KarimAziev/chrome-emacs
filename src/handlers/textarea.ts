import BaseHandler from '@/handlers/base';
import { UpdateTextPayload } from '@/handlers/types';

/**
 * Handler specifically designed for managing textareas.
 */
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
    if (options?.lineNumber && options?.column) {
      this.setPosition(options.lineNumber, options.column);
    }
  }

  private setPosition(line: number, column: number) {
    const lines = this.elem.value.split('\n');

    if (line > lines.length) {
      console.warn(
        'Chrome emacs: Line number exceeds the total number of lines.',
      );
      return;
    }

    let charIndex = 0;
    for (let i = 0; i < line - 1; i++) {
      charIndex += lines[i].length + 1;
    }
    charIndex += column - 1;

    if (column > lines[line - 1].length + 1) {
      console.warn('Chrome emacs: Column number exceeds the line length.');
      return;
    }

    this.elem.selectionStart = charIndex;
    this.elem.selectionEnd = charIndex;
    this.elem.focus();
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
