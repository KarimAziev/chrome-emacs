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
   * Retrieves the URI of the currently targeted Monaco editor element.
   * This method searches up the DOM hierarchy to find an element with a `data-uri` attribute,
   * which is then returned as a Monaco `Uri` object.
   *
   * @returns The `Uri` of the current editor, or `undefined` if the URI cannot be determined.
   */
  private getUri() {
    const editorEl = this.elem?.closest('.monaco-editor');

    return (editorEl as HTMLElement)?.dataset
      ?.uri as unknown as editor.ITextModel['uri'];
  }
  /**
   * Retrieves the text model from a given URI.
   * This method uses the editor's `getModel` method with the URI obtained from `getUri` to fetch the corresponding text model.
   *
   * @returns The text model associated with the given URI, or `undefined` if the model cannot be retrieved.
   */
  private getModel() {
    const uri = this.getUri();
    return (
      uri &&
      this.editor?.getModel &&
      (this.editor.getModel(uri) as ExtendedModel)
    );
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

          const editors =
            isFunction(window.monaco.editor?.getEditors) &&
            window.monaco.editor.getEditors();

          this.model = this.getModel();

          if (Array.isArray(editors)) {
            this.focusedEditor = editors?.find(
              (e) => isFunction(e.getModel) && e.getModel() === this.model,
            );
          }
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

    if (this.focusedEditor?.setValue) {
      this.focusedEditor.setValue(value);

      const position = isNumber(options?.lineNumber) &&
        isNumber(options?.column) && {
          lineNumber: options.lineNumber,
          column: options.column,
        };

      if (position && this.focusedEditor?.setPosition) {
        this.focusedEditor.setPosition(position);
      }

      if (position && this.focusedEditor?.revealPositionInCenter) {
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
    if (this.focusedEditor) {
      return this.focusedEditor.getValue();
    } else if (this.model) {
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
   * @returns The file extension as a array of strings or null if not determinable.
   */
  getExtension() {
    const language = this.getModelLanguageId();
    const languages =
      isFunction(window.monaco?.languages?.getLanguages) &&
      window.monaco?.languages?.getLanguages();

    if (language && Array.isArray(languages)) {
      const found = languages.find((lang) => lang?.id === language);
      return found?.extensions;
    }
    return language && fileExtensionsByLanguage[language];
  }
  /**
   * Intended for binding change event handlers. Currently not implemented as it relies on specific editor event bindings.
   */
  bindChange() {}
}

export default InjectedMonacoHandler;
