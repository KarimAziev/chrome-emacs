import BaseHandler from '@/handlers/base';
import { htmlEscape } from '@/util/string';

/**
 * Handler for contenteditable elements, extending the base handler functionality.
 */
class ContentEditableHandler extends BaseHandler {
  /**
   * Retrieves the text value from a contenteditable element.
   * @returns A promise resolved with the extracted text.
   */
  getValue() {
    const result = this.extractText(this.elem, { noLinebreak: false });
    return Promise.resolve(result);
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

  /**
   * Sets the value of a contenteditable element, converting line breaks to appropriate HTML.
   * @param value - The text value to set, with line breaks indicating new lines.
   */
  setValue(value: string) {
    const htmlValue = value
      .split('\n')
      .map((v) => {
        if (v.trim().length === 0) {
          return '<br>';
        }
        // Escapes HTML characters in the text and wraps lines in <div> tags
        return '<div>' + htmlEscape(v) + '</div>';
      })
      .join('');
    this.elem.innerHTML = htmlValue;
    super.setValue(value);
  }

  /**
   * Determines if this handler is appropriate for a given element based on its contentEditable status.
   * @param elem - The HTMLElement to check.
   * @returns True if the element is contentEditable.
   */
  static canHandle(elem: HTMLElement) {
    return elem.isContentEditable;
  }
}

export default ContentEditableHandler;
