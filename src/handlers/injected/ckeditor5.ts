import BaseInjectedHandler from '@/handlers/injected/base';
import { CustomEventDispatcher } from '@/util/event-dispatcher';
import type { Editor } from '@ckeditor/ckeditor5-core';

/**
 * A handler class for interacting with CKEditor5 editors within an injected context.
 */
class InjectedCKEditor5Handler extends BaseInjectedHandler<HTMLElement> {
  editor!: Editor;
  dispatcher!: CustomEventDispatcher<HTMLElement>;

  /**
   * Initializes the editor by retrieving the CKEditor instance associated with the element.
   */
  async load(): Promise<void> {
    const editorInstance = (
      this.elem as unknown as { ckeditorInstance: Editor }
    ).ckeditorInstance;

    if (!editorInstance) {
      throw new Error(
        'CKEditor5 instance not found or not properly initialized.',
      );
    }
    this.editor = editorInstance;
    this.dispatcher = new CustomEventDispatcher(this.elem);

    this.dispatcher.focus();
  }

  /**
   * Gets the current content (data) of the editor.
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
      this.editor.setData(text);
      this.silenced = false;
    } else {
      this.silenced = false;
    }

    if (!document.activeElement || document.activeElement !== this.elem) {
      this.editor.editing.view.focus();
      this.editor.editing.view.scrollToTheSelection();
    }
  }

  /**
   * Binds a change listener to the editor's content change event.
   * @param f - The function to execute when a content change occurs.
   */
  bindChange(f: (...args: any[]) => void): void {
    this.editor.model.document.on('change:data', () => {
      this.wrapSilence(f)();
    });
  }

  /**
   * Removes a previously bound change listener from the editor.
   * @param f - The function to remove from the event listeners.
   */
  unbindChange(f: () => void): void {
    this.editor.model.document.off('change:data', f);
  }

  /**
   * Determines the file extension associated with CKEditor5 content.
   * If the editor is in Markdown mode, it returns `md`.
   * Otherwise, it defaults to `html`.
   * @returns The file extension (`md` or `html`), or `null` if indeterminate.
   */
  getExtension(): string | null {
    try {
      const isMarkdownMode = this.editor.plugins.get('Markdown') !== undefined;
      if (isMarkdownMode) {
        return 'md';
      }
      return 'html';
    } catch (error) {
      return 'html';
    }
  }
}

export default InjectedCKEditor5Handler;
