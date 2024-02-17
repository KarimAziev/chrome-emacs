import BaseHandler from '@/handlers/base';
// Google Inbox custom events
// removes label when start typing

export default {
  url: new RegExp('https://inbox.google.com.*', 'i'),
  // remove placeholder
  bind: function (this: BaseHandler) {
    const hideLabel = () => {
      const label = this.elem.previousSibling as HTMLElement;
      if (!label || !label.tagName || label.tagName.toLowerCase() !== 'label') {
        return;
      }
      label.innerText = '';
      label.style.display = 'none';
    };

    const handleValueSet = () => {
      const val = this.getValue();
      if (val as unknown) {
        hideLabel();
      } else {
        this.once('valueSet', handleValueSet);
      }
    };

    this.once('valueSet', handleValueSet);
  },
};
