import BaseInjectedHandler from '@/handlers/injected/base';
import 'codemirror/mode/meta';
import DummyCodeMirror from 'dummy-codemirror';
import type { Editor } from 'codemirror';
import { UpdateTextPayload } from '@/handlers/types';
import { isNumber } from '@/util/guard';

declare global {
  interface HTMLDivElement {
    CodeMirror: Editor;
  }
}

class InjectedCodeMirror5Handler extends BaseInjectedHandler<HTMLDivElement> {
  editor!: Editor;

  async load(): Promise<void> {
    while (!this.elem.classList.contains('CodeMirror')) {
      if (!this.elem.parentElement) {
        throw new Error('Parent element not found');
      }
      this.elem = this.elem.parentElement as HTMLDivElement;
    }

    this.editor = this.elem.CodeMirror;
  }

  getValue(): string {
    return this.editor.getValue();
  }

  setValue(text: string, options?: UpdateTextPayload): void {
    this.executeSilenced(() => {
      this.editor.setValue(text);
      const position = isNumber(options?.lineNumber) &&
        isNumber(options?.column) && {
          line: options.lineNumber - 1,
          ch: options.column - 1,
        };
      if (position) {
        this.editor?.setCursor(position, undefined, { scroll: true });
      }
    });
  }

  bindChange(f: () => void): void {
    this.editor.on('change', this.wrapSilence(f));
  }

  unbindChange(f: () => void): void {
    this.editor.off('change', f);
  }

  getPosition() {
    try {
      const cursor = this.editor.getCursor();
      return {
        lineNumber: cursor.line + 1,
        column: cursor.ch + 1,
      };
    } catch (error) {
      return {
        lineNumber: 1,
        column: 1,
      };
    }
  }

  getVisualElement() {
    const cm = this.elem.closest('.CodeMirror, .CodeMirror-linewidget');
    if (cm && cm.matches('.CodeMirror')) {
      return cm.querySelector('.CodeMirror-sizer') || null;
    }
  }

  getExtension(): string | null {
    const editorMode = this.editor?.getMode();
    const currentModeName = editorMode?.name;

    if (DummyCodeMirror.modeInfo) {
      for (const mode of DummyCodeMirror.modeInfo) {
        if (mode.mode === currentModeName && mode.ext) {
          return mode.ext[0];
        }
      }
    }
    return null;
  }
}

export default InjectedCodeMirror5Handler;
