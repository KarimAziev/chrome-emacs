import BaseInjectedHandler from '@/handlers/injected/base';
import { UpdateTextPayload } from '@/handlers/types';
import { fileExtensionsByLanguage } from '@/handlers/config/codemirror';
import { isNumber } from '@/util/guard';
import { codeMirrorSearchLanguage } from '@/util/codemirror';
import { CustomEventDispatcher } from '@/util/event-dispatcher';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';
import type { TransactionSpec } from '@codemirror/state';
import {
  computeChangedFraction,
  diffsToChanges,
  runDiff,
} from '@/util/diff-util';

export type EditorView = import('@codemirror/view').EditorView;

/**
 * Interface describing content element enhanced with CodeMirror 6 specific properties.
 */
interface CMContentElement extends HTMLDivElement {
  cmView: {
    view: EditorView;
  };
}

const initialDiffTimeout = 1.0;
const maxRetryDocLength = 200_000;
const smallRetryChangeRatio = 0.02;

/**
 * A handler class for interacting with CodeMirror 6 editors within an injected context.
 */
class InjectedCodeMirror6Handler extends BaseInjectedHandler<CMContentElement> {
  editor!: EditorView;
  dispatcher!: CustomEventDispatcher<CMContentElement>;
  private _dispatch?: (...args: any[]) => unknown;
  private dispatching = false;
  /**
   * Initializes the editor from the element's properties.
   */
  async load(): Promise<void> {
    if (!this.elem.cmView || !this.elem.cmView?.view?.state) {
      const parent = this.getVisualElement();
      if (parent) {
        const found = Array.from(
          parent.querySelectorAll<HTMLElement>('*'),
        ).find((el) => (el as CMContentElement).cmView?.view?.state);

        if (found) {
          this.elem = found as CMContentElement;
        }
      }
    }

    this.dispatcher = new CustomEventDispatcher(this.elem);
    this.editor = this.elem.cmView.view;

    this.showCursor();
  }
  /**
   * Gets the current value (content) of the editor.
   * @returns The current content of the editor.
   */
  getValue(): string {
    return this.editor.state.doc.toString();
  }

  /**
   * Set the editor content and optionally update the selection.
   *
   * This method computes an optimal set of text changes between the current
   * document and the provided text, and dispatches a CodeMirror transaction.
   *
   * This is necessary to avoid resetting the cursor positions of other collaborators
   * (e.g. on Overleaf).
   *
   * @param text - The new content to set in the editor.
   * @param options - Optional parameters for the update, including selection.
   */

  setValue(text: string, options?: UpdateTextPayload): void {
    const selection = this.getSelection(options);

    const changes = this._getTextChanges(text);

    if (selection || changes) {
      this.dispatching = true;
    }
    if (selection) {
      this.editor.dispatch({
        selection,
        userEvent: 'chrome-emacs',
        scrollIntoView: true,
        ...changes,
      });
    } else if (changes) {
      this.editor.dispatch({ ...changes, userEvent: 'chrome-emacs' });
    }

    this.editor.focus();
    this.dispatching = false;

    this.showCursor();

    this.dispatcher.change();
  }

  /**
   * Compute the CodeMirror transaction "changes" needed to transform the
   * current document into the provided text.
   *
   *
   * @param text - The target document text.
   * @returns A TransactionSpec fragment containing the "changes" array, or null
   *          when no changes are required.
   * @private
   */

  private _getTextChanges(
    text: string,
  ): Required<Pick<TransactionSpec, 'changes'>> | null {
    const currText = this.getValue();
    if (currText === text) {
      return null;
    }

    if (!currText || !text) {
      return {
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: text,
        },
      };
    }

    const currTextLen = currText.length;

    let [diffs, coarse, tookMs] = runDiff(currText, text, {
      diffTimeout: initialDiffTimeout,
    });

    const timedOut = tookMs >= initialDiffTimeout * 1000;
    const changedFraction = computeChangedFraction(diffs);

    const shouldRetry =
      coarse || (timedOut && changedFraction >= smallRetryChangeRatio);

    if (shouldRetry && currTextLen <= maxRetryDocLength) {
      [diffs, coarse, tookMs] = runDiff(currText, text, {
        diffTimeout: initialDiffTimeout,
      });
      console.log(
        'Chrome Emacs: diff retry took',
        tookMs,
        'ms',
        'coarse',
        coarse,
      );
    }

    if (coarse && currTextLen > maxRetryDocLength) {
      return {
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: text,
        },
      };
    }

    const changes = diffsToChanges(diffs);

    if (changes.length === 0) {
      console.warn(
        'Chrome-Emacs: No change chunks produced; falling back to full replace',
      );
      return {
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: text,
        },
      };
    }

    return {
      changes: changes.map((c) => ({
        from: c.from,
        to: c.to,
        insert: c.insert,
      })),
    };
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
   * Binds a change listener to the editor's DOM element and temporarily overrides
   * CodeMirror's dispatch method, since that is the only way to subscribe to internal
   * changes (e.g. changes made by other collaborators on Overleaf).
   *
   * @param f - The function to execute when an input event occurs or when a dispatch
   *            containing code changes is performed.
   */
  bindChange(f: () => void): void {
    this.editor?.dom.addEventListener('input', f);
    this.dispatching = false;
    this._dispatch = this.editor.dispatch;
    Object.defineProperty(this.editor, 'dispatch', {
      ...Object.getOwnPropertyDescriptor(this.editor, 'dispatch'),
      value: (...args: any[]) => {
        const res = this._dispatch!.apply(this.editor, args);
        if (
          !this.dispatching &&
          args?.find(
            (val) => val && val.changes && val.userEvent !== 'chrome-emacs',
          )
        ) {
          f();
        }

        return res;
      },
    });
  }

  /**
   * Restores CodeMirror's original dispatch method.
   */
  dispose(): void {
    if (this._dispatch) {
      Object.defineProperty(this.editor, 'dispatch', {
        ...Object.getOwnPropertyDescriptor(this.editor, 'dispatch'),
        value: this._dispatch,
      });
    }
  }

  onUnload() {
    this.dispose();
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
