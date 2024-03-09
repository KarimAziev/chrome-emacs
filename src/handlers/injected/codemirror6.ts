import BaseInjectedHandler from '@/handlers/injected/base';
import { UpdateTextPayload } from '@/handlers/types';

export type EditorView = import('@codemirror/view').EditorView;

class InjectedCodeMirror6Handler extends BaseInjectedHandler<HTMLDivElement> {
  editor!: EditorView;

  async load(): Promise<void> {
    this.editor = (this.elem.closest('.cm-content') as any).cmView
      .view as EditorView;
  }
  getValue(): string {
    const fieldValue = this.editor.state.doc.toString();

    return fieldValue;
  }

  setValue(text: string, _options?: UpdateTextPayload): void {
    this.editor.dispatch({
      changes: {
        from: 0,
        to: this.editor.state.doc.length,
        insert: text,
      },
    });
  }

  getVisualElement() {
    const cm6 = this.elem.closest('.cm-content');
    if (cm6) {
      return cm6;
    }
  }

  bindChange(_f: () => void): void {}

  unbindChange(_f: () => void): void {}
}

export default InjectedCodeMirror6Handler;
