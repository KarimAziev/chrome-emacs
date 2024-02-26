import { animate, addStyle } from '@/util/dom';

export interface MessageItemParams {
  title?: string;
  text?: string | string | HTMLElement | HTMLElement[];
  style?: Omit<
    Partial<{
      [K in keyof CSSStyleDeclaration as CSSStyleDeclaration[K] extends string
        ? K
        : never]: CSSStyleDeclaration[K];
    }>,
    'top'
  >;
  delay?: number;
  persist?: true;
  type?: keyof typeof messageStyleByType;
}

export type MessageParams = Omit<MessageItemParams, 'text' | 'type'>;

const HINT_ATTRIBUTE_NAME = 'chrome-emacs-message';

const messageStyleByType = {
  error: {
    backgroundColor: 'rgb(253, 237, 237)',
    color: 'rgb(95, 33, 32)',
    borderLeft: `0.375rem solid #fa8072`,
  },
  success: {
    color: 'rgb(30, 70, 32)',
    backgroundColor: '#ddffdd',
    borderLeft: `0.375rem solid #04AA6D`,
  },
  info: {},
};

export class MessageHandler {
  messages: HTMLElement[];

  public error(text: MessageItemParams['text'], params?: MessageParams) {
    this.show({ ...params, type: 'error', text: text });
  }

  public success(text: MessageItemParams['text'], params?: MessageParams) {
    this.show({
      ...params,
      type: 'success',
      text: text,
    });
  }

  public info(text: MessageItemParams['text'], params?: MessageParams) {
    this.show({ ...params, text: text });
  }

  constructor() {
    this.messages = Array.from(
      document.querySelectorAll<HTMLElement>(`[${HINT_ATTRIBUTE_NAME}]`),
    );
  }

  private mapContent(title?: string, text?: MessageItemParams['text']): string {
    const lines = !text ? [] : Array.isArray(text) ? text : [text];
    const content = lines
      .map((l) =>
        l instanceof HTMLElement ? `${l.innerHTML}` : `<div>${l}</div>`,
      )
      .join('');
    return [title ? `<div><strong>${title}</strong></div>` : '', content].join(
      '',
    );
  }

  private createMessageBox(
    html: string,
    params?: {
      onRemove?: (msg: HTMLElement) => void;
      style?: MessageItemParams['style'];
    },
  ): HTMLElement {
    const messageBox = document.createElement('div');
    messageBox.setAttribute(HINT_ATTRIBUTE_NAME, 'message');
    const cross = document.createElement('button');
    cross.innerHTML = '&times;';

    cross.onclick = () => {
      if (params?.onRemove) {
        params.onRemove(messageBox);
      }
      messageBox.remove();
    };
    cross.style.cssText = `color: inherit; position: absolute; right: 0.0625rem; top: 0.0625rem; background: transparent; border: 0rem; font-weight: bold; cursor: pointer; transition: 0.3s;`;

    const defaultStyle = {
      borderRadius: '0.0625rem',
      minWidth: '18.75rem',
      maxWidth: '25rem',
      overflowWrap: 'break-word',
      padding: '0.3125rem 1.25rem',
      position: 'fixed',
      zIndex: '9999',
      fontSize: '1rem',
      transition: 'all 0.2s',
      translate: '-50% 0',
      left: '50%',
      top: '-6.25rem',
      backgroundColor: 'rgb(229, 246, 253)',
      color: 'rgb(1, 67, 97)',
      borderLeft: '0.375rem solid',
    };

    messageBox.innerHTML = html;
    messageBox.prepend(cross);

    return addStyle(messageBox, { ...defaultStyle, ...params?.style });
  }

  private removeMessage = (msg: HTMLElement) => {
    const rectangle = msg.getBoundingClientRect();
    const height = rectangle.height;
    const nextIdx = this.messages.findIndex((e) => e === msg);
    if (nextIdx !== -1) {
      this.messages.slice(0, nextIdx).forEach((el) => {
        const elTop = parseFloat(el.style.top);
        const newValue = elTop - height - 10;
        addStyle(el, { top: `${newValue}px` });
      });
    }

    if (msg.parentNode) {
      msg.parentNode.removeChild(msg);
    }
    this.messages = this.messages.filter((el) => el !== msg);
  };

  private scheduleRemove(msg: HTMLElement, delay: number) {
    const animationParams: Parameters<typeof animate>[0] = {
      duration: 500,
      timing: (timeFraction) => timeFraction,
      draw(progress) {
        const rectangle = msg.getBoundingClientRect();
        const elTop = parseFloat(msg.style.top);

        const height = rectangle.height;
        const newValue = elTop - 10 - height - 10;
        msg.style.top = `${newValue}px`;
        msg.style.opacity = String(1 - progress);
      },
    };
    setTimeout(() => {
      animate(animationParams);
      setTimeout(() => this.removeMessage(msg), animationParams.duration);
    }, delay - animationParams.duration);
  }

  private show(params: MessageItemParams) {
    this.messages = Array.from(
      document.querySelectorAll<HTMLElement>(`[${HINT_ATTRIBUTE_NAME}]`),
    );
    const extraStyle = params.type && messageStyleByType[params.type];
    const msgEl = this.createMessageBox(
      this.mapContent(params.title, params.text),
      {
        onRemove: this.removeMessage,
        style: extraStyle,
      },
    );

    document.body.appendChild(msgEl);

    this.messages.push(msgEl);

    animate({
      duration: 200,
      timing: (timeFraction) => Math.pow(timeFraction, 2),
      draw(progress) {
        msgEl.style.top = progress * 100 + 'px';
      },
    });

    const rectangle = msgEl.getBoundingClientRect();

    const height = rectangle.height;

    if (this.messages.length > 1) {
      this.messages.slice(0, -1).forEach((el) => {
        const elTop = parseFloat(el.style.top);
        const newValue = elTop + height + 10;
        addStyle(el, { top: `${newValue}px` });
      });
    }

    if (!params.persist) {
      this.scheduleRemove(msgEl, params.delay || 5000);
    }
  }
}

export const messager = new MessageHandler();
