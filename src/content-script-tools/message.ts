type PickStringProperties<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

export type MessageStyle = Partial<PickStringProperties<CSSStyleDeclaration>>;

interface MessageItemParams {
  title?: string;
  text?: string | string[];
  style?: MessageStyle;
  delay?: number;
  persist?: true;
  type?: keyof typeof extraStyleColors;
}

const extraStyleColors = {
  error: {
    backgroundColor: 'rgb(253, 237, 237)',
    color: 'rgb(95, 33, 32)',
    borderLeft: `6px solid #fa8072`,
  },
  success: {
    color: 'rgb(30, 70, 32)',
    backgroundColor: '#ddffdd',
    borderLeft: `6px solid #04AA6D`,
  },
};

const addStyle = <Elem extends HTMLElement>(
  elem: Elem,
  style: MessageStyle,
) => {
  (Object.keys(style) as (keyof MessageStyle)[]).forEach((key) => {
    const value = style[key];
    if (value) {
      elem.style[key] = value;
    }
  });
  return elem;
};

export class MessageHandler {
  messages: HTMLElement[];

  constructor() {
    this.messages = [];
  }

  private mapContent(title?: string, text?: string | string[]): string {
    const lines = !text ? [] : Array.isArray(text) ? text : [text];
    const content = lines.map((l) => `<div>${l}</div>`).join('');
    return [title ? `<div><strong>${title}</strong></div>` : '', content].join(
      '',
    );
  }

  private createMessageBox(
    html: string,
    params?: { onRemove?: (msg: HTMLElement) => void; style?: MessageStyle },
  ): HTMLElement {
    const messageBox = document.createElement('div');
    const cross = document.createElement('button');
    cross.innerHTML = '&times;';
    cross.onclick = () => {
      if (params?.onRemove) {
        params.onRemove(messageBox);
      }
      messageBox.remove();
    };
    cross.style.cssText = `color: inherit; position: absolute; right: 1px; top: 1px; background: transparent; border: 0px; font-weight: bold; cursor: pointer; transition: 0.3s;`;
    const defaultStyle: MessageStyle = {
      borderRadius: '1px',
      minWidth: '300px',
      maxWidth: '400px',
      overflowWrap: 'break-word',
      padding: '5px 20px',
      position: 'fixed',
      zIndex: '9999',
      fontSize: '16px',
      transition: 'all 0.2s',
      left: '50%',
      top: '-100px',
      backgroundColor: 'rgb(229, 246, 253)',
      color: 'rgb(1, 67, 97)',
      borderLeft: '6px solid',
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
    setTimeout(() => this.removeMessage(msg), delay);
  }

  error(text: string | string[], params?: Omit<MessageItemParams, 'text'>) {
    this.show({ ...params, type: 'error', text: text });
  }

  success(text: string | string[], params?: Omit<MessageItemParams, 'text'>) {
    this.show({
      ...params,
      type: 'success',
      text: text,
    });
  }
  info(text: string | string[], params?: Omit<MessageItemParams, 'text'>) {
    this.show({ ...params, text: text });
  }

  show(params: MessageItemParams) {
    const extraStyle = params.type && extraStyleColors[params.type];
    const msgEl = this.createMessageBox(
      this.mapContent(params.title, params.text),
      {
        onRemove: this.removeMessage,
        style: extraStyle,
      },
    );
    msgEl.style.top = '100px';
    document.body.appendChild(msgEl);
    this.messages.push(msgEl);

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
