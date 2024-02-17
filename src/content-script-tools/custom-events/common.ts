import BaseHandler from '@/handlers/base';

const common = {
  url: /.*/,
  bind: function (this: BaseHandler, _window: Window): void {
    if (this.on) {
      this.on('valueSet', (_value: string, options?: any) => {
        if (options && options.triggerDOMEvent === false) {
          return;
        }

        // Create the KeyboardEvent using the constructor
        const evt: KeyboardEvent = new KeyboardEvent('keypress', {
          bubbles: true,
          cancelable: true,
        });

        if (this.elem) {
          this.elem.dispatchEvent(evt);
        }
      });
    }
  },
};

export default common;
