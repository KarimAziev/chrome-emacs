import { addStyle } from '@/util/dom';
import { KeySequenceReader } from '@/util/key-reader';

const HINT_ATTRIBUTE_NAME = 'data-chrome-emacs-hint';

export interface HintItem<Value = unknown> {
  element: HTMLElement;
  tooltipText?: string;
  value: Value;
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

export interface HintReaderParams {
  characters?: string;
  exitKeybingings?: string[];
}
class HintReader<Value> {
  private isReading: boolean = false;
  private hints: [HintElem, HintItem<Value>][] = [];
  private observers: IntersectionObserver[] = [];
  private resizeObservers: ResizeObserver[] = [];
  private reader: KeySequenceReader;

  private characters = 'ASDFGQWERTZXCVB';
  private exitKeybingings = ['Ctrl-g', 'Escape'];

  constructor({ characters, exitKeybingings }: HintReaderParams) {
    const existingHints = document.querySelectorAll(`[${HINT_ATTRIBUTE_NAME}]`);
    if (characters) {
      this.characters = characters;
    }
    if (exitKeybingings) {
      this.exitKeybingings = exitKeybingings;
    }
    this.updateHintPositions = this.updateHintPositions.bind(this);
    this.onPartialMatch = this.onPartialMatch.bind(this);
    this.isReading = existingHints.length > 0;
  }

  public getIsReading(): boolean {
    return (
      this.isReading ||
      document.querySelectorAll(`[${HINT_ATTRIBUTE_NAME}]`).length > 0
    );
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
      // background: 'rgba(0,0,0,0.4)',
      transition: 'background 0.3s ease-in',
    };
  }

  private updateHintPositions(): void {
    this.hints.forEach(([hint, item]) => {
      const rect = item.element.getBoundingClientRect();
      addStyle(hint, this.getHintStyleFromRect(rect));
    });
  }

  genLabels(amount: number): string[] {
    const characters = this.characters;
    const shortcuts: string[] = [];
    const length =
      amount === 1
        ? 1
        : Math.ceil(Math.log(amount) / Math.log(characters.length));

    const generate = (prefix: string, len: number) => {
      if (len === 0) {
        if (shortcuts.length < amount) {
          shortcuts.push(prefix);
        }
        return;
      }
      for (let i = 0; i < characters.length && shortcuts.length < amount; i++) {
        generate(prefix + characters[i], len - 1);
      }
    };

    generate('', length);

    return shortcuts;
  }

  private async makeHint(params: MakeHintParams<Value>) {
    const { elem, text, onClick, tooltipText } = params;
    const hint = document.createElement('div') as HintElem;
    const hintText = document.createElement('kbd');
    const tooltip = document.createElement('span');

    hint.setAttribute(HINT_ATTRIBUTE_NAME, text);

    hint.appendChild(hintText);
    hint.appendChild(tooltip);

    hint.style.background = 'rgba(0,0,0,0.4)';

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
      hint.style.background = 'rgba(0,0,0,0.4)';
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

  private findHintPair(text: string) {
    return (
      this.hints.find(
        ([h, _item]) =>
          h.isConnected && h.getAttribute(HINT_ATTRIBUTE_NAME) === text,
      ) || []
    );
  }

  private onPartialMatch(text?: string) {
    this.hints.forEach(([h, _item]) => {
      const textElem = h.firstElementChild!;
      const elText = textElem.textContent!;
      if (text && h.getAttribute(HINT_ATTRIBUTE_NAME)?.startsWith(text)) {
        const suffix = elText.substring(text.length);
        const suffixEl = document.createElement('span');
        suffixEl.textContent = suffix;
        const prefixEl = document.createElement('span');
        prefixEl.textContent = text;

        addStyle(prefixEl, { color: 'grey' });
        textElem.replaceChildren(prefixEl, suffixEl);
        h.style.background = 'rgba(0,0,0,0.1)';
      } else if (text) {
        const prefixEl = document.createElement('span');
        prefixEl.textContent = elText;
        addStyle(prefixEl, { color: 'grey' });
        textElem.replaceChildren(prefixEl);
        h.style.background = 'rgba(0,0,0,0.4)';
      } else {
        textElem.replaceChildren(elText);
        h.style.background = 'rgba(0,0,0,0.4)';
      }
    });
  }

  public readItems(
    itemsOrItemsCreator: HintItem<Value>[] | (() => HintItem<Value>[]),
  ): Promise<HintItem<Value>> {
    return new Promise(async (resolve, reject) => {
      if (this.isReading) {
        return reject(new Error('Read operation is already in progress'));
      }
      this.isReading = true;

      const items = Array.isArray(itemsOrItemsCreator)
        ? itemsOrItemsCreator
        : itemsOrItemsCreator();

      if (items.length > 0) {
        const hintChars = this.genLabels(items.length).map((str) =>
          str.length === 1 ? str : str.split('').join(' '),
        );

        const onDone = (text: string) => {
          const [_el, item] = this.findHintPair(text);
          if (item) {
            resolve(item);
          } else {
            reject(item);
          }

          this.cancel();
        };

        items.forEach((item, i) =>
          this.makeHint({
            elem: item.element,
            item,
            text: hintChars[i],
            tooltipText: item.tooltipText,
            onClick: onDone,
          }),
        );

        window.addEventListener('resize', this.updateHintPositions);

        this.reader = new KeySequenceReader({
          keybindings: [...hintChars, ...this.exitKeybingings],
          onDone,
          preventDefaults: true,
          onPartialDone: this.onPartialMatch,
          onMismatch: this.onPartialMatch,
        });
        this.reader.listen();
      } else {
        this.cancel();
        reject();
      }
    });
  }

  public cancel(): void {
    this.isReading = false;
    if (this.reader) {
      this.reader.cleanup();
    }

    this.cleanup();
  }

  private cleanup(): void {
    this.hints.forEach(([hint, _]) => {
      hint.cleanup();
      hint.remove();
    });

    window.removeEventListener('resize', this.updateHintPositions);
    this.observers.forEach((o) => o.disconnect());
    this.observers = [];
    this.resizeObservers.forEach((o) => o.disconnect());
    this.resizeObservers = [];

    this.hints = [];
  }
}

export { HintReader };
