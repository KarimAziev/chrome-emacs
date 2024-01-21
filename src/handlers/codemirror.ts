import InjectorHandler from './injector';
import type { ContentEventsBinder } from './injector';

class CodeMirrorHandler extends InjectorHandler {
  constructor(elem: HTMLElement, contentEvents: ContentEventsBinder) {
    super(elem, contentEvents, 'codemirror');
  }

  setValue(value: string, options: any) {
    options = Object.assign({}, { triggerDOMEvent: false }, options);
    super.setValue(value, options);
  }
  static canHandle(elem: HTMLElement) {
    let res: null | HTMLElement = elem;
    while (res) {
      if (res.classList && res.classList.contains('CodeMirror')) {
        return true;
      }
      res = res.parentElement;
    }
    return false;
  }
}

export default CodeMirrorHandler;
