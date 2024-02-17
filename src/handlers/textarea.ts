import BaseHandler from '@/handlers/base';

/**
 * Handler specifically designed for managing textareas.
 */
class TextareaHandler extends BaseHandler {
  elem: HTMLTextAreaElement;
  /**
   * Sets a value to the textarea element and dispatches an 'input' event.
   * @param value - The value to set on the textarea.
   */
  setValue(value: string) {
    this.elem.value = value;
    // Create and dispatch an input event to simulate user input
    const event = new Event('input', {
      bubbles: true,
      cancelable: true,
    });

    super.setValue(value); // Call the parent class's setValue as well

    this.elem.dispatchEvent(event);
  }

  /**
   * Retrieves the current value from the textarea element.
   * @returns A promise resolved with the current value of the textarea.
   */
  getValue() {
    return Promise.resolve(this.elem.value);
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
