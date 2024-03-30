import { debounce } from '@/util/debounce';

export interface CustomEventDetail {
  atomicChromeSynteticEvent: boolean;
}

export class CustomEventDispatcher<El extends HTMLElement> {
  elem: El;
  constructor(elem: El) {
    this.elem = elem;
  }

  debouncedChange = debounce(this.change.bind(this), 1000);

  change(options?: InputEventInit) {
    this.dispatchAtomicChromeEvent('change', options);
  }

  keyup(options?: KeyboardEventInit) {
    this.dispatchAtomicChromeEvent('keyup', options);
  }

  focus(options?: FocusEventInit) {
    this.dispatchAtomicChromeEvent('focus', options);
  }

  beforeinput(options?: InputEventInit) {
    this.dispatchAtomicChromeEvent('beforeinput', options);
  }

  input(options?: InputEventInit) {
    this.dispatchAtomicChromeEvent('input', options);
  }

  keypress(options?: KeyboardEventInit) {
    this.dispatchAtomicChromeEvent('keypress', options);
  }

  keydown(options?: KeyboardEventInit) {
    this.dispatchAtomicChromeEvent('keydown', options);
  }

  click(options?: MouseEventInit) {
    const rect = this.elem.getBoundingClientRect();
    const initDict = {
      clientX: rect.x + rect.width / 2,
      clientY: rect.x + rect.height / 2,
      bubbles: true,
      ...options,
    };

    this.elem.dispatchEvent(new MouseEvent('mousedown', initDict));
    this.elem.dispatchEvent(new MouseEvent('mouseup', initDict));
    this.elem.click();
  }

  paste(v: string) {
    const event = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    event?.clipboardData?.setData('text/plain', v);
    this.elem.dispatchEvent(event);
  }

  dispatchAtomicChromeEvent<T extends string>(type: T, options?: EventInit) {
    this.elem?.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        ...options,
        detail: { atomicChromeSyntheticEvent: true },
      }),
    );
  }

  static isAtomicChromeCustomEvent(
    v: any,
  ): v is CustomEvent<CustomEventDetail> {
    return (
      v instanceof CustomEvent && v.detail?.atomicChromeSyntheticEvent === true
    );
  }
}
