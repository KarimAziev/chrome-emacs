import BaseInjectedHandler from '@/handlers/injected/base';
import { UpdateTextPayload } from '@/handlers/types';
import { fileExtensionsByLanguage } from '@/handlers/config/codemirror';
import 'codemirror/mode/meta';
import DummyCodeMirror from 'dummy-codemirror';
import { isNumber, isString } from '@/util/guard';
import { isValueMatches } from '@/util/string';

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

  /**
   * Initializes the editor from the element's properties.
   */
  async load(): Promise<void> {
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
    this.editor.dispatch({
      changes: {
        from: 0,
        to: this.editor.state.doc.length,
        insert: text,
      },
    });

    if (selection) {
      this.editor.dispatch({
        selection,
        userEvent: 'select',
        scrollIntoView: true,
      });
    }
    this.showCursor();
  }

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

  showCursor() {
    const visual = this.getVisualElement();

    if (visual) {
      const isFocused = visual.classList.contains('cm-focused');

      if (!isFocused) {
        visual.classList.add('cm-focused');
      }
    }
  }

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

  getVisualElement() {
    return this.elem.closest<HTMLDivElement>('.cm-editor');
  }

  bindChange(f: () => void): void {
    this.editor.dom.addEventListener('input', f);
  }

  unbindChange(f: () => void): void {
    this.editor.dom.removeEventListener('input', f);
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

    if (!DummyCodeMirror.modeInfo) {
      return null;
    }

    const secondLine = [];
    const thirdLine = [];
    for (const mode of DummyCodeMirror.modeInfo) {
      const name = mode?.name?.toLowerCase() || mode?.mode.toLowerCase();
      if (name === languageNormalized && mode.ext) {
        const extension = mode.ext[0];
        return extension;
      } else if (mode.ext && mode.ext[0]) {
        const vals = Object.values(mode);

        if (
          vals.find(
            (v) => isString(v) && languageNormalized === v.toLowerCase(),
          )
        ) {
          secondLine.push(mode);
        } else if (
          vals.find((v) => isString(v) && isValueMatches(languageNormalized, v))
        ) {
          thirdLine.push(mode);
        }
      }
    }

    const fallbackResult =
      secondLine.find((m) => m.ext) || thirdLine.find((m) => m.ext);

    const fallbackExt = fallbackResult?.ext && fallbackResult?.ext[0];

    return fallbackExt || null;
  }
}

export default InjectedCodeMirror6Handler;
