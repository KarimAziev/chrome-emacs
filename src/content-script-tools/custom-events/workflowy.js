import { htmlEscape } from '@/util/string';

export default {
  url: new RegExp('https://workflowy.com.*', 'i'),
  // override setvalue
  bind: function (window) {
    this.setValue = (value) => {
      this.elem.innerHTML = htmlEscape(value);
    };

    this.extractTextFromUnknownElem = (elem, options) => {
      return elem.innerText;
    };
  },
};
