import BaseInjectedHandler from '@/handlers/injected/base';

interface AceMode {
  mode: string;
  extensions: string;
}

class InjectedAceHandler extends BaseInjectedHandler<HTMLElement> {
  constructor(elem: HTMLElement, uuid: string) {
    super(elem, uuid);

    this.silenced = false;
  }
  editor: ReturnType<typeof ace.edit>;
  modes: AceMode[];
  loaded: boolean;

  load() {
    return new Promise<void>((resolve) => {
      if (this.elem.parentElement) {
        this.editor = ace.edit(this.elem.parentElement);
      }

      this.editor.$blockScrolling = Infinity;
      return resolve();
    });
  }

  getExtension() {
    if (!this.modes) {
      return null;
    }
    const session = this.editor.getSession();
    const currentMode =
      session && session.getMode() && (session.getMode() as any).$id;
    if (!currentMode) {
      return null;
    }
    for (const mode of this.modes) {
      if (mode.mode === currentMode) {
        return mode.extensions.split('|')[0];
      }
    }
    return null;
  }

  getValue() {
    return this.editor.getValue();
  }

  setValue(text: string) {
    this.executeSilenced(() => this.editor.setValue(text, 1));
  }

  bindChange(f: (...args: any[]) => void) {
    this.editor.on('change', this.wrapSilence(f));
  }

  unbindChange(f: (...args: any[]) => void) {
    this.editor.off('change', f);
  }
}

export default InjectedAceHandler;
