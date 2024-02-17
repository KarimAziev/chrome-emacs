import { editor } from 'monaco-editor';
import BaseInjectedHandler from '@/handlers/injected/base';
import { findAncestorWithClass } from '@/util/dom';
import { fileExtensionsByLanguage } from '@/handlers/config/monaco';
import { isFunction, isString, isNumber } from '@/util/guard';
import { UpdateTextPayload } from '@/handlers/types';

declare global {
  /**
   * Extends the window interface to include monaco editor.
   */
  interface Window {
    monaco: typeof import('monaco-editor');
  }
}

/**
 * Some versions of the Monaco editor have a `getLanguageIdentifier` method,
 *  while others have a `getLanguageId` method.
 */
interface ExtendedModel extends editor.ITextModel {
  getLanguageIdentifier: () => { language: string };
}

/**
 * Handler for injecting Monaco Editor functionalities into HTMLTextAreaElements.
 */
class InjectedMonacoHandler extends BaseInjectedHandler<HTMLTextAreaElement> {
  editor?: typeof window.monaco.editor;
  model?: ExtendedModel;
  focusedEditor?: editor.ICodeEditor;

  /**
   * Constructs an instance of InjectedMonacoHandler.
   * @param elem - The HTMLTextAreaElement to be enhanced.
   * @param uuid - An identifier for the instance.
   */
  constructor(elem: HTMLTextAreaElement, uuid: string) {
    super(elem, uuid);
    this.silenced = false;
  }

  /**
   * Retreives the active or first model from the Monaco editor.
   * @returns The current editor model.
   */
  private getModel() {
    if (this.focusedEditor) {
      return this.focusedEditor.getModel() as ExtendedModel;
    }

    const models = this.editor?.getModels();

    const model =
      models?.find((m) => (m.getValue() || '').length > 0) ||
      (models && models[0]);

    return model as unknown as ExtendedModel;
  }

  /**
   * Initializes the Monaco editor variables and active editor if possible.
   * @returns A promise indicating the completion of the loading process.
   */

  load() {
    return new Promise<void>((resolve) => {
      try {
        if (typeof window.monaco !== 'undefined' && window.monaco.editor) {
          this.editor = window.monaco.editor;
          const editors = window.monaco.editor?.getEditors();
          this.focusedEditor = editors?.find((e) => e?.hasTextFocus());
          this.model = this.getModel();
        }
      } catch (error) {
        throw new Error('Monaco editor is not available.');
      } finally {
        return resolve();
      }
    });
  }

  /**
   * Sets the editor or textarea value and optionally moves the caret.
   * @param value - New value to be set.
   * @param options - Options to control the text update.
   */
  setValue(value: string, options?: UpdateTextPayload) {
    if (this.model) {
      this.model.setValue(value);
    }
    if (this.focusedEditor) {
      this.focusedEditor.setValue(value);

      const position = isNumber(options?.lineNumber) &&
        isNumber(options?.column) && {
          lineNumber: options.lineNumber,
          column: options.column,
        };

      if (position) {
        this.focusedEditor.setPosition(position);
        this.focusedEditor.revealPositionInCenter(position);
      }
    } else if (this.elem) {
      this.elem.value = value;
    }
  }

  /**
   * Attempts to find an ancestor element with a Monaco-related CSS class.
   * @returns The found element or undefined.
   */
  private findAncestorWithMonacoClass() {
    return (
      findAncestorWithClass(this.elem, 'editor-instance') ||
      findAncestorWithClass(this.elem, 'monaco-editor')
    );
  }

  /**
   * Retrieves the current value from the Monaco editor model or textarea.
   * @returns The current value as a string.
   */
  getValue() {
    if (this.model) {
      return this.model.getValue();
    } else if (!this.elem) {
      return '';
    } else {
      return this.findAncestorWithMonacoClass()?.textContent || this.elem.value;
    }
  }

  /**
   * Obtains the language ID using the appropriate method from the Monaco model.
   * @returns The language ID or undefined.
   */
  private getModelLanguageId() {
    const model = this.model;
    if (!model) {
      return;
    }

    const methodName = (
      ['getLanguageId', 'getLanguageIdentifier'] as const
    ).find((name) => isFunction(model[name]));

    const lang = methodName && model[methodName]();

    return isString(lang) ? lang : lang?.language;
  }

  /**
   * Determines the file extension associated with the current language in the Monaco editor model.
   * @returns The file extension as a string or null if not determinable.
   */
  getExtension() {
    const language = this.getModelLanguageId();
    return language && fileExtensionsByLanguage[language];
  }
  /**
   * Intended for binding change event handlers. Currently not implemented as it relies on specific editor event bindings.
   */
  bindChange() {}
}

export default InjectedMonacoHandler;
