import BaseInjectedHandler from '@/handlers/injected/base';
import { UpdateTextPayload } from '@/handlers/types';
import { fileExtensionsByLanguage } from '@/handlers/config/codemirror';
import 'codemirror/mode/meta';
import DummyCodeMirror from 'dummy-codemirror';
import { isNumber } from '@/util/guard';

export type EditorView = import('@codemirror/view').EditorView;

interface CMContentElement extends HTMLDivElement {
  cmView: {
    view: EditorView;
  };
}

class InjectedCodeMirror6Handler extends BaseInjectedHandler<CMContentElement> {
  editor!: EditorView;

  async load(): Promise<void> {
    this.editor = this.elem.cmView.view;
  }
  getValue(): string {
    const fieldValue = this.editor.state.doc.toString();

    return fieldValue;
  }

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
  getExtension(): string | null {
    const currentModeName = this.elem.dataset.language;

    // we use some hardcoded overrides because the `modeInfo` may contain duplicates, e.g., css => gcss
    if (currentModeName && fileExtensionsByLanguage[currentModeName]) {
      return fileExtensionsByLanguage[currentModeName];
    }

    if (currentModeName && DummyCodeMirror.modeInfo) {
      for (const mode of DummyCodeMirror.modeInfo) {
        if (mode.mode === currentModeName && mode.ext) {
          const extension = mode.ext[0];

          return extension;
        }
      }
    }
    return null;
  }
}

export default InjectedCodeMirror6Handler;
