import BaseHandler from './base';

class TextareaHandler extends BaseHandler {
  elem: HTMLTextAreaElement;

  setValue(value: string) {
    this.elem.value = value;
    var event = new Event('input', {
      bubbles: true,
      cancelable: true,
    });
    super.setValue(value);
    this.elem.dispatchEvent(event);
  }

  getValue() {
    return Promise.resolve(this.elem.value);
  }
  static canHandle(elem: HTMLTextAreaElement) {
    if (!elem.tagName) {
      return false;
    }
    return elem.tagName.toLowerCase() === 'textarea';
  }
}

export default TextareaHandler;
