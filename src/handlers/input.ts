import BaseHandler from '@/handlers/base';
import { CustomEventDispatcher } from '@/util/event-dispatcher';
import { estimateParent, setSelectionRange } from '@/util/dom';
import type {
  LoadedOptions,
  UpdateTextPayload,
  Selection,
} from '@/handlers/types';
import { RuntimeSettings } from '@/options/runtime-settings';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';
import {
  ALLOWED_INPUT_TYPES,
  NON_SELECTION_INPUT_TYPES,
} from '@/handlers/config/allowed-inputs';

class InputHandler extends BaseHandler<HTMLInputElement> {
  dispatcher!: CustomEventDispatcher<HTMLInputElement>;
  private lastSel: Selection;

  setValue(value: string, options?: UpdateTextPayload) {
    this.elem.focus();

    this.dispatcher.beforeinput();
    this.elem.value = value;
    super.setValue(value, options);
    this.dispatcher.keydown();
    this.dispatcher.keypress();
    this.dispatcher.textInput();
    this.dispatcher.input();

    this.setSelection(options?.selections);

    this.dispatcher.keyup();

    this.dispatcher.change();
  }

  private setSelection(selections: UpdateTextPayload['selections']) {
    if (
      NON_SELECTION_INPUT_TYPES.has(this.elem.type) ||
      !Array.isArray(selections) ||
      !selections[0]
    ) {
      return;
    }

    const sel = selections[0];
    const valLen = this.elem.value.length;

    const { start, end } =
      sel.end === valLen && sel.start === sel.end
        ? { start: sel.start - 1, end: sel.end - 1 }
        : sel;

    this.lastSel = sel;

    try {
      setSelectionRange(this.elem, start, end);

      if (start === end && this.elem.selectionEnd !== null) {
        this.elem.selectionEnd = this.elem.selectionEnd + 1;
      }
    } catch (err) {
      console.log('Chrome Emacs: Failed to set selection', err);
    }
  }

  private getSelectionPosition() {
    const start = this.elem.selectionStart ?? 0;
    const end = this.elem.selectionEnd ?? start;
    return { start, end };
  }

  getValue() {
    const { start, end } = this.getSelectionPosition();
    this.lastSel = { start, end };
    return Promise.resolve({
      text: this.elem.value,
      selections: [{ start, end }],
      lineNumber: 1,
      column: end + 1,
    });
  }

  getVisualElement(): Element | HTMLElement | null {
    return estimateParent(this.elem);
  }

  load(): Promise<LoadedOptions> {
    this.dispatcher = new CustomEventDispatcher(this.elem);
    this.dispatcher.focus();

    const parentEl = this.getVisualElement();
    const rect = parentEl?.getBoundingClientRect();
    const screenY = window.screenY;

    const { end } = this.getSelectionPosition();
    const payload = {
      lineNumber: 1,
      column: end + 1,
      rect,
    };

    if (payload?.rect) {
      payload.rect.y = (rect?.y || 0) + screenY;
      payload.rect.x = (rect?.x || 0) + window.screenX;
    }

    return Promise.resolve(payload);
  }

  static getHintArea(elem: HTMLElement) {
    return estimateParent(elem);
  }

  static getName() {
    return 'input';
  }

  static canHandle(elem: HTMLInputElement) {
    const settings = RuntimeSettings.get();

    if (!settings.allowVisibleInputs) {
      return false;
    }

    if (!(elem instanceof HTMLInputElement)) {
      return false;
    }

    if (elem.disabled || elem.readOnly) {
      return false;
    }

    const type = (elem.type || 'text').toLowerCase();

    if (!ALLOWED_INPUT_TYPES.has(type)) {
      return false;
    }

    if (
      Object.values(VISUAL_ELEMENT_SELECTOR).some((selector) =>
        elem.closest(selector),
      )
    ) {
      return false;
    }

    return true;
  }

  unbindChange(f: (event: Event) => void) {
    super.unbindChange(f);
    if (this.lastSel && !NON_SELECTION_INPUT_TYPES.has(this.elem.type)) {
      try {
        setSelectionRange(this.elem, this.lastSel.start, this.lastSel.end);
      } catch (err) {
        console.log('Chrome Emacs: Failed to set selection', err);
      }
    }
  }
}

export default InputHandler;
