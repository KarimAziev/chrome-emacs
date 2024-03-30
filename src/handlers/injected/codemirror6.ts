import BaseInjectedHandler from '@/handlers/injected/base';
import { UpdateTextPayload } from '@/handlers/types';
import { fileExtensionsByLanguage } from '@/handlers/config/codemirror';
import { isNumber } from '@/util/guard';
import { codeMirrorSearchLanguage } from '@/util/codemirror';
import { CustomEventDispatcher } from '@/util/event-dispatcher';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

export type EditorView = import('@codemirror/view').EditorView;

/**
 * Interface describing content element enhanced with CodeMirror 6 specific properties.
 */
interface CMContentElement extends HTMLDivElement {
  cmView: {
    view: EditorView;
  };
}

/**
 * A handler class for interacting with CodeMirror 6 editors within an injected context.
 */
class InjectedCodeMirror6Handler extends BaseInjectedHandler<CMContentElement> {
  editor!: EditorView;
  dispatcher!: CustomEventDispatcher<CMContentElement>;

  /**
   * Initializes the editor from the element's properties.
   */
  async load(): Promise<void> {
    if (!this.elem.cmView || !this.elem.cmView?.view?.state) {
      const parent = this.getVisualElement();
      if (parent) {
        const found = Array.from(parent.querySelectorAll<HTMLElement>('*'))
          .flat()
          .find((el) => (el as CMContentElement).cmView?.view?.state);

        if (found) {
          this.elem = found as CMContentElement;
        }
      }
    }

    this.dispatcher = new CustomEventDispatcher(this.elem);
    this.dispatcher.click();
    this.dispatcher.focus();
    this.editor = this.elem.cmView.view;
  }
  /**
   * Gets the current value (content) of the editor.
   * @returns The current content of the editor.
   */
  getValue(): string {
    const fieldValue = this.editor.state.doc.toString();

    return fieldValue;
  }

  /**
   * Sets the content of the editor with an optional selection and options.
   * @param text - The new content to set in the editor.
   * @param options - Optional parameters for the update, including selections.
   */
  setValue(text: string, options?: UpdateTextPayload): void {
    const selection = this.getSelection(options);

    if (this.getValue() !== text) {
      this.editor.dispatch({
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: text,
        },
      });
    }

    this.editor.focus();

    if (selection) {
      this.editor.dispatch({
        selection,
        userEvent: 'select',
        scrollIntoView: true,
      });
    }

    this.showCursor();

    this.dispatcher.change();
  }

  /**
   * Generates a selection within the editor based on the provided options.
   * @param options - Optional parameters including line number, column, and selections.
   * @returns A selection object or undefined.
   * @private
   */

  private getSelection(options?: UpdateTextPayload) {
    const selections = options?.selections?.map(({ start, end }) => ({
      anchor: end,
      head: start,
    }));

    const selection =
      (selections && selections[0]) ||
      (isNumber(options?.lineNumber) &&
        isNumber(options.column) && {
          anchor:
            this.editor?.state?.doc?.line(options.lineNumber).from +
            options.column -
            1,
        });

    return selection || undefined;
  }

  /**
   * Shows the cursor within the editor's visual element.
   */
  showCursor() {
    const visual = this.getVisualElement();

    if (visual) {
      const isFocused = visual.classList.contains('cm-focused');

      if (!isFocused) {
        visual.classList.add('cm-focused');
      }
    }
  }

  /**
   * Retrieves the current cursor position within the editor.
   * @returns An object containing the line number and column of the cursor.
   */
  getPosition() {
    try {
      const offset = this.editor.state.selection.main.head;
      const line = this.editor.state.doc.lineAt(offset);

      return { lineNumber: line.number, column: offset - line.from + 1 };
    } catch (error) {
      return {
        lineNumber: 1,
        column: 1,
      };
    }
  }
  /**
   * Fetches the visual element corresponding to the editor.
   * @returns The HTML div element representing the visual editor component.
   */
  getVisualElement() {
    return this.elem.closest<HTMLDivElement>(VISUAL_ELEMENT_SELECTOR.cmEditor);
  }

  /**
   * Binds a change listener to the editor's DOM element.
   * @param f - The function to execute when an input event occurs.
   */
  bindChange(f: () => void): void {
    this.editor?.dom.addEventListener('input', f);
  }
  /**
   * Removes a previously bound change listener from the editor's DOM element.
   * @param f - The function to remove from the event listeners.
   */
  unbindChange(f: () => void): void {
    this.editor?.dom.removeEventListener('input', f);
  }

  /**
   * Determines the file extension associated with the editor's current language mode.
   * @returns The file extension as a string, or null if no extension could be determined.
   */
  getExtension(): string | null {
    const currentModeName = this.elem.dataset.language;
    const languageNormalized = currentModeName?.toLowerCase();

    if (!languageNormalized) {
      return null;
    }

    // we use some hardcoded overrides because the `modeInfo` may contain duplicates, e.g., css => gcss
    if (fileExtensionsByLanguage[languageNormalized]) {
      return fileExtensionsByLanguage[languageNormalized];
    }
    return codeMirrorSearchLanguage(languageNormalized) || null;
  }
}

export default InjectedCodeMirror6Handler;
