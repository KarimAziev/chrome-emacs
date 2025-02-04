import BaseHandler from '@/handlers/base';
import { CustomEventDispatcher } from '@/util/event-dispatcher';
import { estimateParent, hasClassWithPrefix } from '@/util/dom';
import { LoadedOptions } from '@/handlers/types';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

/**
 * Handler for contenteditable elements, extending the base handler functionality.
 */
class ContentEditableHandler extends BaseHandler {
  dispatcher!: CustomEventDispatcher<HTMLElement>;
  getVisualElement(): Element | HTMLElement | null {
    return estimateParent(this.elem);
  }
  load(): Promise<LoadedOptions> {
    this.dispatcher = new CustomEventDispatcher(this.elem);
    const parentEl = this.getVisualElement();
    const rect = parentEl?.getBoundingClientRect();
    const screenY = window.screenY;
    this.dispatcher.click();
    this.dispatcher.focus();

    const payload = {
      rect,
    };
    if (payload?.rect) {
      payload.rect.y = (rect?.y || 0) + screenY;
      payload.rect.x = (rect?.x || 0) + window.screenX;
    }

    return Promise.resolve(payload);
  }
  /**
   * Retrieves the text value from a contenteditable element.
   * @returns A promise resolved with the extracted text.
   */
  getValue() {
    return Promise.resolve({ text: this.elem.innerHTML });
  }

  /**
   * Sets the value of a contenteditable element, converting line breaks to appropriate HTML.
   * @param value - The text value to set, with line breaks indicating new lines.
   */
  setValue(value: string) {
    if (value === this.elem.innerHTML) {
      return;
    }

    this.dispatcher.click();
    this.dispatcher.focus();
    this.dispatcher.beforeinput();

    this.elem.innerHTML = value;

    this.dispatcher.keydown();
    this.dispatcher.keypress();
    this.elem.dispatchEvent(
      new CompositionEvent('textInput', { bubbles: true }),
    );
    this.dispatcher.input();
    this.dispatcher.keyup();

    this.dispatcher.change();
  }

  static getName() {
    return 'content-editable';
  }

  static getHintArea(elem: HTMLElement) {
    return elem;
  }

  /**
   * Determines if this handler is appropriate for a given element based on its contentEditable status.
   * @param elem - The HTMLElement to check.
   * @returns True if the element is contentEditable.
   */
  static canHandle(elem: HTMLElement) {
    return (
      elem.isContentEditable &&
      !Object.values(VISUAL_ELEMENT_SELECTOR).some((v) => elem.closest(v)) &&
      !hasClassWithPrefix(elem, 'cke_')
    );
  }
}

export default ContentEditableHandler;
