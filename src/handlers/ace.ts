import InjectorHandler from '@/handlers/injector';
import type { IContentEventsBinder } from '@/handlers/injector';

const aceClassName = 'ace_text-input';

class AceHandler extends InjectorHandler {
  constructor(elem: HTMLElement, contentEvents: IContentEventsBinder) {
    super(elem, contentEvents, 'ace');
  }
  static canHandle(elem: HTMLElement) {
    return elem.classList.contains(aceClassName);
  }
}

export default AceHandler;
