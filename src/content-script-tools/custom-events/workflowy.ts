import BaseHandler from '@/handlers/base';
import { htmlEscape } from '@/util/string';

interface WorkflowyInstance extends BaseHandler {
  extractTextFromUnknownElem: (elem: HTMLElement) => string;
}

export default {
  url: new RegExp('https://workflowy.com.*', 'i'),
  // override setvalue
  bind: function (this: WorkflowyInstance) {
    this.setValue = (value) => {
      this.elem.innerHTML = htmlEscape(value);
    };

    this.extractTextFromUnknownElem = (elem) => {
      return elem.innerText;
    };
  },
};
