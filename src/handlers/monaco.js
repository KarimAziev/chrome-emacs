import InjectorHandler from './injector';

class MonacoHandler extends InjectorHandler {
  constructor(elem, contentEvents) {
    super(elem, contentEvents, 'monaco');
  }
  setValue(value) {
    this.elem.value = value;

    var event = new Event('input', {
      bubbles: true,
      cancelable: true,
    });

    this.elem.dispatchEvent(event);
    super.setValue(value);
  }

  getValue() {
    const value = super.getValue();
    return Promise.resolve(value);
  }
}

MonacoHandler.canHandle = function (elem) {
  const result =
    elem.tagName &&
    elem.tagName.toLowerCase() === 'textarea' &&
    elem.classList.contains('monaco-mouse-cursor-text');

  return result;
};

export default MonacoHandler;
