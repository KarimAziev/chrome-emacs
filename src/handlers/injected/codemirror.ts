import BaseInjectedHandler from './base';
import 'codemirror/mode/meta';

import CodeMirror, { Editor } from 'codemirror';

// NOTE: keep modes which could conflict or which do not resolve here
const commonModes: { [key: string]: string } = {
  css: 'css',
  htmlmixed: 'html',
  html: 'html',
  javascript: 'js',
};

declare global {
  interface HTMLDivElement {
    CodeMirror: Editor;
  }
}

class InjectedCodeMirrorHandler extends BaseInjectedHandler<HTMLDivElement> {
  editor!: Editor;

  async load(): Promise<void> {
    while (!this.elem.classList.contains('CodeMirror')) {
      if (!this.elem.parentElement) throw new Error('Parent element not found');
      this.elem = this.elem.parentElement as HTMLDivElement;
    }

    this.editor = this.elem.CodeMirror;
  }

  getValue(): string {
    return this.editor.getValue();
  }

  setValue(text: string): void {
    this.executeSilenced(() => this.editor.setValue(text));
  }

  bindChange(f: () => void): void {
    this.editor.on('change', this.wrapSilence(f));
  }

  unbindChange(f: () => void): void {
    this.editor.off('change', f);
  }

  getExtension(): string | null {
    const currentModeName = this.editor.getMode().name;
    if (currentModeName && commonModes[currentModeName]) {
      return commonModes[currentModeName];
    }
    for (const mode of CodeMirror.modeInfo) {
      if (mode.mode === currentModeName && mode.ext) {
        return mode.ext[0];
      }
    }
    return null;
  }
}

export default InjectedCodeMirrorHandler;
