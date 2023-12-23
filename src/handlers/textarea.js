import BaseHandler from './base';

class TextareaHandler extends BaseHandler {
  setValue(value) {
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
}

TextareaHandler.canHandle = function (elem) {
  return elem.tagName && elem.tagName.toLowerCase() === 'textarea';
};

export default TextareaHandler;
