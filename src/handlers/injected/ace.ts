import BaseInjectedHandler from '@/handlers/injected/base';
import { UpdateTextPayload } from '@/handlers/types';
import { isNumber } from '@/util/guard';

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
      if (!(ace as any).config || !(ace as any).config.loadModule) {
        return resolve();
      }

      (ace as any).config.loadModule(
        'ace/ext/modelist',
        (m: { modes: AceMode[] }) => {
          this.modes = m.modes;
          this.loaded = true;
          resolve();
        },
      );
      // NOTE: no callback when loadModule fails, so add a timeout
      setTimeout(() => {
        if (!this.loaded) {
          resolve();
        }
      }, 3000);
    });
  }

  getExtension() {
    if (!this.modes) {
      const mode = this.editor?.session?.getMode();

      return (mode as unknown as { $id: string })?.$id?.split('/').pop();
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

  getPosition() {
    const positionData = this.editor?.getCursorPosition();
    return {
      lineNumber: positionData?.row + 1 || 1,
      column: positionData?.column + 1 || 1,
    };
  }

  setPosition(options?: UpdateTextPayload) {
    if (
      isNumber(options?.column) &&
      isNumber(options?.lineNumber) &&
      this.editor?.gotoLine
    ) {
      this.editor.gotoLine(options.lineNumber, options.column - 1);
    }
  }

  setValue(text: string, options?: UpdateTextPayload) {
    this.executeSilenced(() => {
      this.editor.setValue(text, 1);
      this.setPosition(options);
      this.setSelection(options);
    });
  }

  private setFallbackSelection(options?: UpdateTextPayload) {
    if (!this.editor || !options?.selections) {
      return;
    }
    try {
      const { start, end } = options.selections[0];

      this.editor
        .getSession()
        .getSelection()
        .setSelectionRange({
          start: this.editor.getSession().doc.indexToPosition(start, 0),
          end: this.editor.getSession().doc.indexToPosition(end, 0),
        });
    } catch (_error) {}
  }

  private setSelection(options?: UpdateTextPayload) {
    if (!this.editor || !options?.selections) {
      return;
    }

    try {
      const Range = ace.require('ace/range').Range;

      this.editor.getSelection().clearSelection();

      options.selections.forEach((selection, index) => {
        const { start, end } = selection;

        const startPosition = this.editor
          .getSession()
          .doc.indexToPosition(start, 0);
        const endPosition = this.editor
          .getSession()
          .doc.indexToPosition(end, 0);

        const range = new Range(
          startPosition.row,
          startPosition.column,
          endPosition.row,
          endPosition.column,
        );

        if (index === 0) {
          this.editor.getSelection().setSelectionRange(range);
        } else {
          this.editor.getSelection().addRange(range);
        }
      });
    } catch (_error) {
      this.setFallbackSelection(options);
    }
  }

  bindChange(f: (...args: any[]) => void) {
    this.editor.on('change', this.wrapSilence(f));
  }

  unbindChange(f: (...args: any[]) => void) {
    this.editor.off('change', f);
  }
}

export default InjectedAceHandler;
