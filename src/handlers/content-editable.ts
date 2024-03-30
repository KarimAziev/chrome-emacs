import BaseHandler from '@/handlers/base';
import { CustomEventDispatcher } from '@/util/event-dispatcher';
import { estimateParent } from '@/util/dom';
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
    const result = this.extractText(this.elem, { noLinebreak: false });
    return Promise.resolve({ text: result });
  }

  /**
   * Extracts text from an element, optionally preserving line breaks.
   * @param elem - The DOM node to extract text from.
   * @param options - Extract text options, including line break handling.
   * @returns The extracted text as a string.
   */
  private extractText(
    elem: Node,
    options: { noLinebreak?: boolean } = {},
  ): string {
    return Array.from(elem.childNodes)
      .map((child, i) => {
        if (child.nodeType === Node.TEXT_NODE) {
          return (child as Text).wholeText + (options.noLinebreak ? '' : '\n');
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const element = child as Element;
          const tag = element.tagName.toLowerCase();

          switch (tag) {
            case 'div':
              return this.extractText(element, { noLinebreak: true }) + '\n';
            case 'br':
              // Do not add a line-break if 'noLinebreak' is true or it's the last child
              const noBreak =
                options.noLinebreak || i === elem.childNodes.length - 1;
              return noBreak ? '' : '\n';
            default:
              // Fallback for non-handled elements
              return this.extractTextFromUnknownElem(element as HTMLElement);
          }
        } else {
          // Ignore non-text and non-element nodes
          return '';
        }
      })
      .join('');
  }

  /**
   * Extracts text from unknown elements by returning their outer HTML.
   * @param elem - The HTMLElement to process.
   * @returns The outer HTML of the element.
   */
  private extractTextFromUnknownElem(elem: HTMLElement) {
    return elem.outerHTML;
  }

  private selectAllContent() {
    if (this.elem?.focus) {
      this.elem.focus();
    }

    const selection = window.getSelection();

    selection?.removeAllRanges();

    const range = document.createRange();

    range.selectNodeContents(this.elem);

    selection?.addRange(range);
  }

  private replaceSelectedContent(value: string) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const div = document.createElement('div');
      div.innerHTML = value;
      const frag = document.createDocumentFragment();
      let lastNode;
      while ((lastNode = div.firstChild)) {
        frag.appendChild(lastNode);
      }
      range.insertNode(frag);
    }
  }

  /**
   * Sets the value of a contenteditable element, converting line breaks to appropriate HTML.
   * @param value - The text value to set, with line breaks indicating new lines.
   */
  setValue(value: string) {
    this.dispatcher.click();
    this.dispatcher.focus();
    this.dispatcher.beforeinput();

    const htmlValue = value
      .split('\n')
      .map((v) => {
        if (v.trim().length === 0) {
          return '<br>';
        }
        return '<div>' + v + '</div>';
      })
      .join('');
    this.selectAllContent();
    this.replaceSelectedContent(htmlValue);

    const selection = window.getSelection();

    selection?.removeAllRanges();

    this.dispatcher.keydown();
    this.dispatcher.keypress();
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
      !Object.values(VISUAL_ELEMENT_SELECTOR).some((v) => elem.closest(v))
    );
  }
}

export default ContentEditableHandler;
