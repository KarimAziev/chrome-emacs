import BaseHandler from '@/handlers/base';

const common = {
  url: /.*/,
  bind: function (this: BaseHandler, _window: Window): void {
    if (this.on) {
      this.on('valueSet', (_value: string, options?: any) => {
        if (options && options.triggerDOMEvent === false) {
          return;
        }

        if (this.elem?.dispatchEvent) {
          const eventOptions = {
            bubbles: true,
            cancelable: true,
          };

          this.elem.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
        }
      });
    }
  },
};

export default common;
