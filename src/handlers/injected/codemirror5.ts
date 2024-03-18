import BaseInjectedHandler from '@/handlers/injected/base';
import type { Editor } from 'codemirror';
import { fileExtensionsByLanguage } from '@/handlers/config/codemirror';
import { UpdateTextPayload } from '@/handlers/types';
import { isNumber } from '@/util/guard';
import { codeMirrorSearchLanguage } from '@/util/codemirror';

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
      this.editor?.focus();
      this.setPosition(options);
      this.setSelection(options?.selections);
    });
  }

  private setPosition(options?: UpdateTextPayload) {
    if (isNumber(options?.lineNumber) && isNumber(options.column)) {
      const position = {
        line: options.lineNumber - 1,
        ch: options.column - 1,
      };

      this.editor?.setCursor(position, undefined, { scroll: true });

      const cursorEl = this.elem.querySelector<HTMLElement>(
        '.CodeMirror-cursors',
      );

      if (cursorEl) {
        cursorEl.style.visibility = 'visible';
      }
    }
  }

  private setSelection(selections?: UpdateTextPayload['selections']) {
    const sels = selections?.map(({ start, end }) => {
      const posA = this.editor.posFromIndex(start);
      const posB = this.editor.posFromIndex(end);
      return { anchor: posB, head: posA };
    });
    if (sels && sels.length > 1) {
      if (sels) {
        this.editor.setSelections(sels, 0);
      }
    } else if (sels) {
      const sel = sels[0];
      if (sel) {
        this.editor.setSelection(sel.head, sel.anchor);
      }
    }
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

    if (!currentModeName) {
      return null;
    }

    // we use some hardcoded overrides because the `modeInfo` may contain duplicates, e.g., css => gcss
    if (currentModeName && fileExtensionsByLanguage[currentModeName]) {
      return fileExtensionsByLanguage[currentModeName];
    }

    return codeMirrorSearchLanguage(currentModeName) || null;
  }
}

export default InjectedCodeMirror5Handler;
