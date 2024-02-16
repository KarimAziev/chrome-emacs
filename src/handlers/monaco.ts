import InjectorHandler from './injector';
import type { IContentEventsBinder } from './injector';

class MonacoHandler extends InjectorHandler {
  constructor(elem: HTMLTextAreaElement, contentEvents: IContentEventsBinder) {
    super(elem, contentEvents, 'monaco');
  }
  elem: HTMLTextAreaElement;
  setValue(value: string) {
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

  static canHandle(elem: HTMLTextAreaElement) {
    return (
      elem.tagName.toLowerCase() === 'textarea' &&
      elem.classList.contains('monaco-mouse-cursor-text')
    );
  }
}

export default MonacoHandler;
