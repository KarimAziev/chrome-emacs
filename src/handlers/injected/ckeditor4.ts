import BaseInjectedHandler from '@/handlers/injected/base';
import { CustomEventDispatcher } from '@/util/event-dispatcher';
import { hasClassWithPrefix } from '@/util/dom';

/**
 * A handler class for interacting with CKEditor4 editors within an injected context.
 */
class InjectedCKEditor4Handler extends BaseInjectedHandler<HTMLElement> {
  editor!: CKEDITOR.editor;
  dispatcher!: CustomEventDispatcher<HTMLElement>;

  /**
   * Initializes the editor by retrieving the CKEditor instance associated with the element.
   */

  async load(): Promise<void> {
    let res: null | HTMLElement = this.elem;
    const instances = window?.CKEDITOR.instances;
    while (
      res &&
      res.parentElement &&
      hasClassWithPrefix(res.parentElement, 'cke_')
    ) {
      res = res.parentElement;
    }

    const children = res.querySelectorAll('*');
    const child =
      Array.from(children).find(
        (element) => element.id && instances[element.id],
      ) || null;

    const prevEl = res.previousElementSibling;
    const elem = [child, prevEl].find((n) => n?.id);
    const instanceId = elem?.id;

    if (!instanceId) {
      throw new Error('CKEditor4 instance not found for the provided element.');
    }
    this.elem = elem as HTMLElement;

    this.editor = window.CKEDITOR.instances[instanceId!];
    this.dispatcher = new CustomEventDispatcher(this.elem);

    this.dispatcher.focus();
  }

  /**
   * Gets the current value (content) of the editor.
   * @returns The current content of the editor.
   */
  getValue(): string {
    return this.editor.getData();
  }

  /**
   * Sets the content of the editor with an optional selection and options.
   * @param text - The new content to set in the editor.
   */
  setValue(text: string): void {
    this.silenced = true;
    const value = this.getValue();

    if (value !== text) {
      this.editor.setData(text, {
        callback: () => {
          this.silenced = false;
        },
      });
    } else {
      this.silenced = false;
    }

    if (!this.editor.focusManager?.hasFocus) {
      this.editor?.focus();
    }
  }

  /**
   * Binds a change listener to the editor's content change event.
   * @param f - The function to execute when a content change occurs.
   */
  bindChange(f: (...args: any[]) => void) {
    this.editor.on('change', () => {
      this.wrapSilence(f)();
    });
  }

  /**
   * Removes a previously bound change listener from the editor.
   * @param f - The function to remove from the event listeners.
   */
  unbindChange(f: () => void): void {
    this.editor.removeListener('change', f);
  }

  /**
   * Determines the file extension associated with CKEditor4 content.
   * For CKEditor, this is usually HTML, as it primarily works with rich text.
   * @returns The file extension (`html`), or `null` if indeterminate.
   */
  getExtension(): string | null {
    try {
      if ((this.editor.plugins as any)?.markdown) {
        return 'md';
      }
      return 'html';
    } catch (err) {
      return 'html';
    }
  }
}

export default InjectedCKEditor4Handler;
