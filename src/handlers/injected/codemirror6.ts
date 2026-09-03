import BaseInjectedHandler from '@/handlers/injected/base';
import { UpdateTextPayload } from '@/handlers/types';
import { fileExtensionsByLanguage } from '@/handlers/config/codemirror';
import { isNumber } from '@/util/guard';
import { codeMirrorSearchLanguage } from '@/util/codemirror';
import { CustomEventDispatcher } from '@/util/event-dispatcher';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';
import type { TransactionSpec } from '@codemirror/state';
import { getTextChangeChunks } from '@/util/diff-util';

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
  private _dispatch?: (...args: any[]) => unknown;
  private _dispatchEditor?: EditorView;
  private changeHandler?: () => void;
  private observer?: MutationObserver;
  private targetRefreshScheduled = false;
  private dispatching = false;

  /**
   * Initializes the editor from the element's properties.
   */
  async load(): Promise<void> {
    const editorElement = this.resolveCurrentElement();
    if (!editorElement) {
      throw new Error('CodeMirror 6 editor is not available.');
    }

    this.elem = editorElement;
    this.editor = editorElement.cmView.view;
    this.dispatcher = new CustomEventDispatcher(this.elem);

    this.showCursor();
  }
  /**
   * Gets the current value (content) of the editor.
   * @returns The current content of the editor.
   */
  getValue(): string {
    this.syncEditorReference();
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
    this.syncEditorReference();
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
   * @param text - The target document text.
   * @returns A TransactionSpec fragment containing the "changes" array, or null
   *          when no changes are required.
   * @private
   */

  private _getTextChanges(
    text: string,
  ): Required<Pick<TransactionSpec, 'changes'>> | null {
    const changes = getTextChangeChunks(this.getValue(), text);

    if (!changes) {
      return null;
    }

    if (changes.length === 1) {
      const [change] = changes;
      return {
        changes: {
          from: change.from,
          to: change.to,
          insert: change.insert,
        },
      };
    }

    return {
      changes: changes.map((change) => ({
        from: change.from,
        to: change.to,
        insert: change.insert,
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

    if (visual && !visual.classList.contains('cm-focused')) {
      visual.classList.add('cm-focused');
    }
  }

  /**
   * Retrieves the current cursor position within the editor.
   * @returns An object containing the line number and column of the cursor.
   */
  getPosition() {
    this.syncEditorReference();
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
    this.changeHandler = this.wrapSilence(() => {
      this.syncEditorReference();
      f();
    });

    this.attachEditorListeners();
    this.observeEditorChanges();
  }

  /**
   * Restores CodeMirror's original dispatch method.
   */
  dispose(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.detachEditorListeners();
  }

  onUnload() {
    this.dispose();
  }
  /**
   * Removes a previously bound change listener from the editor's DOM element.
   * @param _f - The function to remove from the event listeners.
   */
  unbindChange(_f: () => void): void {
    this.dispose();
  }

  /**
   * Determines the file extension associated with the editor's current language mode.
   * @returns The file extension as a string, or null if no extension could be determined.
   */
  getExtension(): string | null {
    this.syncEditorReference();
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

  private resolveCurrentElement(): CMContentElement | null {
    const visual = this.getVisualElement();

    return (
      this.resolveElementWithinRoot(this.elem) ||
      this.resolveElementWithinRoot(visual) ||
      this.resolveElementWithinRoot(document.activeElement) ||
      this.resolveElementWithinRoot(
        document.querySelector(VISUAL_ELEMENT_SELECTOR.cmEditor),
      ) ||
      this.resolveElementWithinRoot(document.body)
    );
  }

  private resolveElementWithinRoot(
    root?: ParentNode | Element | null,
  ): CMContentElement | null {
    if (!root) {
      return null;
    }

    if ('isConnected' in root && root !== document.body && !root.isConnected) {
      return null;
    }

    const current = root as CMContentElement;
    if (current.cmView?.view?.state) {
      return current;
    }

    if (!('querySelectorAll' in root)) {
      return null;
    }

    const found = Array.from(root.querySelectorAll<HTMLElement>('*')).find(
      (el) => (el as CMContentElement).cmView?.view?.state,
    );

    return (found as CMContentElement | undefined) || null;
  }

  private syncEditorReference(notify = false): boolean {
    const nextElem = this.resolveCurrentElement();
    const nextEditor = nextElem?.cmView?.view;

    if (!nextElem || !nextEditor) {
      return false;
    }

    const editorChanged = nextEditor !== this.editor;

    if (editorChanged) {
      this.detachEditorListeners();
      this.elem = nextElem;
      this.editor = nextEditor;
      this.dispatcher = new CustomEventDispatcher(this.elem);
      this.attachEditorListeners();
      this.showCursor();
    } else if (nextElem !== this.elem) {
      this.elem = nextElem;
      this.dispatcher = new CustomEventDispatcher(this.elem);
    }

    if (editorChanged && notify) {
      this.changeHandler?.();
    }

    return editorChanged;
  }

  private attachEditorListeners(): void {
    if (!this.changeHandler || !this.editor) {
      return;
    }

    this.editor.dom.addEventListener('input', this.changeHandler);
    this.dispatching = false;
    this._dispatch = this.editor.dispatch;
    this._dispatchEditor = this.editor;

    const pred = (val: any) =>
      val && (val.changes || val.selection) && val.userEvent !== 'chrome-emacs';

    Object.defineProperty(this.editor, 'dispatch', {
      ...Object.getOwnPropertyDescriptor(this.editor, 'dispatch'),
      value: (...args: any[]) => {
        const res = this._dispatch!.apply(this.editor, args);

        if (!this.dispatching && args?.find(pred)) {
          this.changeHandler?.();
        }

        return res;
      },
    });
  }

  private detachEditorListeners(): void {
    if (this.changeHandler && this.editor) {
      this.editor.dom.removeEventListener('input', this.changeHandler);
    }

    if (this._dispatch && this._dispatchEditor) {
      Object.defineProperty(this._dispatchEditor, 'dispatch', {
        ...Object.getOwnPropertyDescriptor(this._dispatchEditor, 'dispatch'),
        value: this._dispatch,
      });
    }

    this._dispatch = undefined;
    this._dispatchEditor = undefined;
  }

  private observeEditorChanges(): void {
    if (this.observer) {
      return;
    }

    this.observer = new MutationObserver(() => {
      if (this.targetRefreshScheduled) {
        return;
      }

      this.targetRefreshScheduled = true;
      queueMicrotask(() => {
        this.targetRefreshScheduled = false;
        this.syncEditorReference(true);
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

export default InjectedCodeMirror6Handler;
