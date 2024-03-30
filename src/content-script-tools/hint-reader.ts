import { addStyle } from '@/util/dom';

const HINT_ATTRIBUTE_NAME = 'data-chrome-emacs-hint';

export interface HintItem<Value = unknown> {
  element: HTMLElement;
  tooltipText?: string;
  value?: Value;
}

export interface MakeHintParams<Value = unknown> {
  elem: HTMLElement;
  item: HintItem<Value>;
  text: string;
  onClick?: (char: string) => void;
  tooltipText?: string;
}

export interface HintElem extends HTMLDivElement {
  cleanup: () => void;
}

export type HintPair<Value = unknown> = [HintElem, HintItem<Value>];

class HintReader {
  private isReading: boolean = false;
  private hints: HintPair[] = [];
  private listener: ((e: KeyboardEvent) => void) | null = null;
  private observers: IntersectionObserver[] = [];
  private resizeObservers: ResizeObserver[] = [];

  characters = 'asdfgqwertzxcvb';

  constructor() {
    const existingHints = document.querySelectorAll(`[${HINT_ATTRIBUTE_NAME}]`);
    this.updateHintPositions = this.updateHintPositions.bind(this);
    this.isReading = existingHints.length > 0;
  }

  public getIsReading(): boolean {
    return (
      this.isReading ||
      document.querySelectorAll(`[${HINT_ATTRIBUTE_NAME}]`).length > 0
    );
  }

  isEscapeKey(event: KeyboardEvent): boolean {
    return (event.ctrlKey && event.key === 'g') || event.key === 'Escape';
  }

  private getHintStyleFromRect(
    rect: Pick<DOMRect, 'top' | 'left' | 'height' | 'width'>,
  ) {
    return {
      position: 'absolute',
      top: `${window.scrollY + rect.top + 1}px`,
      left: `${window.scrollX + rect.left + 1}px`,
      width: `${rect.width + 1}px`,
      height: `${rect.height + 1}px`,
      cursor: 'pointer',
      zIndex: '10000',
      background: 'rgba(0,0,0,0.2)',
      transition: 'background 0.3s ease-in',
    };
  }

  private updateHintPositions(): void {
    this.hints.forEach(([hint, item]) => {
      const rect = item.element.getBoundingClientRect();
      addStyle(hint, this.getHintStyleFromRect(rect));
    });
  }

  genLabels(total: number): string[] {
    const characters = this.characters;
    let hints: string[] = [''];
    let counter = 0;

    while (counter < total) {
      const prefix = hints[counter++];
      if (!prefix) {
        hints = characters.split('').concat(hints);
        continue;
      }
      hints = hints.concat(characters.split('').map((char) => char + prefix));
    }

    return hints.slice(0, total).map((label) => label.toUpperCase());
  }

  private async makeHint<Value>(params: MakeHintParams<Value>) {
    const { elem, text, onClick, tooltipText } = params;
    const hint = document.createElement('div') as HintElem;
    const hintText = document.createElement('span');
    const tooltip = document.createElement('span');

    hint.setAttribute(HINT_ATTRIBUTE_NAME, text);

    hint.appendChild(hintText);
    hint.appendChild(tooltip);

    hintText.textContent = text;
    tooltip.textContent = tooltipText || '';

    const hintTextStyle = {
      background: '#000000',
      color: '#ff1493',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      border: '2px solid #ff1493',
      padding: '0.125rem 0.25rem',
      borderRadius: '0.25rem',
      fontSize: '1.5rem',
    };

    addStyle(hintText, hintTextStyle);

    addStyle(tooltip, {
      ...hintTextStyle,
      position: 'absolute',
      right: '0',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      background: 'rgba(0,0,0,0.8)',
      fontSize: '0.8rem',
      border: '1px solid #ff1493',
      padding: '0.125rem',
      opacity: '0',
      transition: 'opacity 0.3s ease',
    });

    const listener = () => {
      if (onClick) {
        onClick(text);
      }
    };
    const highlight = () => {
      hint.style.cursor = 'pointer';
      hint.style.background = 'rgba(0,0,0,0.1)';
      tooltip.style.opacity = '1';
    };

    const unhighlight = () => {
      hint.style.background = 'rgba(0,0,0,0.5)';
      tooltip.style.opacity = '0';
    };

    if (onClick) {
      hint.addEventListener('click', listener);
    }

    hint.addEventListener('mouseenter', highlight);
    hint.addEventListener('mouseleave', unhighlight);

    const resizeObserver = new ResizeObserver((_entries) => {
      this.updateHintPositions();
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const rect = entry.intersectionRect;
            addStyle(hint, this.getHintStyleFromRect(rect));

            if (!hint.isConnected) {
              document.body.appendChild(hint);
            }
          } else {
            if (hint.isConnected) {
              hint.remove();
            }
          }
        });
      },
      {
        root: null,
        threshold: 0.1,
      },
    );
    hint.cleanup = () => {
      hint.removeEventListener('click', listener);
      hint.removeEventListener('mouseenter', highlight);
      hint.removeEventListener('mouseleave', unhighlight);
    };

    observer.observe(elem);
    resizeObserver.observe(elem);
    this.observers.push(observer);
    this.resizeObservers.push(resizeObserver);
    this.hints.push([hint, params.item]);
  }

  public readItems<Value>(
    itemsOrItemsCreator: HintItem<Value>[] | (() => HintItem<Value>[]),
  ): Promise<HintItem<Value>> {
    return new Promise(async (resolve, reject) => {
      if (this.isReading) {
        return reject(new Error('Read operation is already in progress'));
      }
      this.isReading = true;

      const onClick = (text: string) => {
        const simulatedEvent = new KeyboardEvent('keydown', { key: text });
        this.handleKeydown(resolve, reject, simulatedEvent);
      };

      this.listener = (event: KeyboardEvent) =>
        this.handleKeydown(resolve, reject, event);

      const items = Array.isArray(itemsOrItemsCreator)
        ? itemsOrItemsCreator
        : itemsOrItemsCreator();

      if (items.length > 0) {
        const hintChars = this.genLabels(items.length);

        items.forEach((item, i) =>
          this.makeHint<Value>({
            elem: item.element,
            item,
            text: hintChars[i],
            tooltipText: item.tooltipText,
            onClick,
          }),
        );
        window.addEventListener('scroll', this.updateHintPositions);
        window.addEventListener('resize', this.updateHintPositions);
        window.addEventListener('keydown', this.listener);
      } else {
        this.cancel();
        reject();
      }
    });
  }

  private handleKeydown<Value>(
    resolve: (el: HintItem<Value>) => void,
    reject: (reason?: any) => void,
    event: KeyboardEvent,
  ) {
    const key = event.key.toUpperCase();
    const isCancelled = this.isEscapeKey(event);

    const [_hintItem, item] =
      this.hints.find(
        ([h, _item]) =>
          h.isConnected && h.getAttribute(HINT_ATTRIBUTE_NAME) === key,
      ) || [];

    if (item || isCancelled) {
      event.preventDefault();
      this.cancel();
      item ? resolve(item as HintItem<Value>) : reject(new Error('Cancelled'));
    }
  }

  public cancel(): void {
    this.isReading = false;
    this.cleanup();
  }

  private cleanup(): void {
    this.hints.forEach(([hint, _]) => {
      hint.cleanup();
      hint.remove();
    });
    if (this.listener) {
      window.removeEventListener('keydown', this.listener);
      this.listener = null;
    }
    window.removeEventListener('scroll', this.updateHintPositions);
    window.removeEventListener('resize', this.updateHintPositions);
    this.observers.forEach((o) => o.disconnect());
    this.observers = [];
    this.resizeObservers.forEach((o) => o.disconnect());
    this.resizeObservers = [];

    this.hints = [];
  }
}

export default new HintReader();
