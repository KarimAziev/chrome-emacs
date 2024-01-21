import BaseHandler from './base';

function escapeHTML(s: string) {
  if (!s) {
    return s;
  }
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

class ContentEditableHandler extends BaseHandler {
  getValue() {
    const result = this.extractText(this.elem, { noLinebreak: false });
    return Promise.resolve(result);
  }

  // TODO: extract this to a dedicated class
  extractText(elem: Node, options: { noLinebreak?: boolean } = {}): string {
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
              const noBreak =
                options.noLinebreak || i === elem.childNodes.length - 1;
              return noBreak ? '' : '\n';
            default:
              return this.extractTextFromUnknownElem(element as HTMLElement);
          }
        } else {
          return '';
        }
      })
      .join('');
  }

  extractTextFromUnknownElem(elem: HTMLElement) {
    return elem.outerHTML;
  }

  setValue(value: string) {
    const htmlValue = value
      .split('\n')
      .map((v) => {
        if (v.trim().length === 0) {
          return '<br>';
        }
        return '<div>' + escapeHTML(v) + '</div>';
      })
      .join('');
    this.elem.innerHTML = htmlValue;
    super.setValue(value);
  }
  static canHandle(elem: HTMLElement) {
    return elem.isContentEditable;
  }
}

export default ContentEditableHandler;
