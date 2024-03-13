import type { editor, IDisposable } from 'monaco-editor';
import BaseInjectedHandler from '@/handlers/injected/base';
import { findAncestorWithClass } from '@/util/dom';
import { fileExtensionsByLanguage } from '@/handlers/config/monaco';
import { isFunction, isString, isNumber } from '@/util/guard';
import { UpdateTextPayload } from '@/handlers/types';
import { replaceNonBreakingSpaces } from '@/util/string';
import { ElementEventMonitor } from '@/util/event-monitor';
import { log } from '@/util/log';

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
  /**
   * Represents the monaco editor instance. This is undefined if Monaco has not been initialized.
   */
  editor?: typeof window.monaco.editor;
  /**
   * The text model representing the content within the Monaco editor. This model provides
   * functionalities such as setting/getting value, observing changes etc.
   */
  model?: ExtendedModel;
  /**
   * A reference to the currently focused Monaco code editor instance.
   * This is used for syncing the cursor position.
   * It may be undefined in some contexts.
   */
  focusedEditor?: editor.ICodeEditor;
  /**
   * Stores a reference to the subscription for listening to text model content changes.
   * This allows for cleanup by calling its `dispose` method.
   */
  changeListener?: IDisposable;

  elementEventMonitor: ElementEventMonitor;
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
   * Retrieves the text model from a given URI. This method uses the editor's
   * `getModel` method with the URI obtained from `getUri` to fetch the
   * corresponding text model.
   *
   * @returns The text model associated with the given URI, or `undefined` if
     the model cannot be retrieved.
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
          } else {
            this.hackMonaco();
          }

          if (!this.focusedEditor?.hasTextFocus()) {
            this.focusedEditor?.focus();
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
   * `hackMonaco` serves as a workaround to recreate a Monaco editor instance
   * while preserving its associated model. This approach is necessary when
   * `window.monaco.editor.create` is accessible but the editor instance, or
   * methods to retrieve such instances, are not exposed directly.
   *
   * #### Functionality
   * 1. **DOM Manipulation**: Initially, `hackMonaco`
   * identifies and removes the `.monaco-editor` DOM element to which the Monaco
   * model was attached. This is crucial because the Monaco editor expects the
   * parent container to be devoid of any child nodes to correctly read its size
   * and to ensure proper binding of the model to a clean slate DOM.
   *
   * 2. **Model Preservation**: By retaining the Monaco model associated with the
   * original editor instance, `hackMonaco` ensures that the text content,
   * language configuration, and other stateful information of the document remain
   * intact across editor re-creations. This model is then reused when creating a
   * ew editor instance, effectively reestablishing the connection to the DOM
   * without loss of information.
   *
   * 3. **Event Monitor Utilization**: The method employs `ElementEventMonitor` to
   * manage the DOM listeners that are reattached to the container by
   * `monaco.editor.create`. Since the recreation process might inadvertently bind
   * extension-specific listeners to the container, `ElementEventMonitor`
   * facilitates the removal of these listeners, ensuring a clean integration
   * without interference from unintended event handlers.
   *
   * 4. **Editor and Model Relationship**: It is important to note that while the
   * model preserves the document's textual content and configurations, the cursor
   * position and text selections cannot be maintained through the model alone and
   * require an editor instance. The `hackMonaco` method acknowledges this
   * distinction by focusing on model preservation while addressing cursor and
   * selection states separately.
   *
   * 5. **Fallback Position**: Prior to obtaining or recreating the editor
   * instance, `hackMonaco` employs a fallback mechanism for estimating the
   * cursor's position. This provisional solution remains in place until direct
   * access to the editor's instance enables precise cursor and selection
   * manipulation based on the editor's API.
   *
   */
  private hackMonaco() {
    const el = this.getVisualElement();
    if (!el) {
      return;
    }

    const value = this.model?.getValue();
    const position = this.getFallbackPosition();

    const parent = el?.parentElement;

    parent?.removeAttribute('data-keybinding-context');

    if (parent) {
      this.elementEventMonitor = new ElementEventMonitor(parent);
      this.elementEventMonitor.start();

      parent?.removeChild(el);

      this.focusedEditor = window.monaco.editor.create(parent as HTMLElement, {
        model: this.model,
        automaticLayout: true,
        value,
      });

      if (position) {
        try {
          this.focusedEditor?.setPosition(position);
        } catch (err) {}
      }
    }
  }

  onUnload() {
    if (this.focusedEditor) {
      try {
        this.focusedEditor.focus();
      } catch (error) {
        log('onUnload error', error);
      }
    }
    if (this.elementEventMonitor) {
      this.elementEventMonitor.cleanup();
    }
  }

  /**
   * Sets the editor or textarea value and optionally moves the caret.
   * @param value - New value to be set.
   * @param options - Options to control the text update.
   */
  setValue(value: string, options?: UpdateTextPayload) {
    this.executeSilenced(() => {
      const val = this.getValue();

      if (val !== value) {
        if (this.focusedEditor?.setValue) {
          this.focusedEditor.setValue(value);
        } else if (this.model) {
          this.model.setValue(value);
        } else {
          this.elem.value = value;
        }
      }
      this.setPosition(options);
    });
  }

  /**
   * Sets the cursor position within the editor or textarea, based on the
     provided options.
   * @param options - Options with position and selection data
   */
  private setPosition(options?: UpdateTextPayload) {
    const lineNumber = options?.lineNumber;
    const column = options?.column;

    if (isNumber(lineNumber) && isNumber(column)) {
      const position = {
        lineNumber: lineNumber,
        column: column,
      };

      if (this.focusedEditor?.setPosition) {
        this.focusedEditor.setPosition(position);
      }

      if (this.focusedEditor?.revealPosition) {
        this.focusedEditor.revealPositionInCenterIfOutsideViewport(position);
      }
      if (!this.focusedEditor?.hasTextFocus()) {
        this.focusedEditor?.focus();
      }
    }
    try {
      this.setSelection(options?.selections);
    } catch (error) {
      console.log('chrome-emacs: Cannot set selection', error);
    }
  }

  private setSelection(selections: UpdateTextPayload['selections']) {
    if (!selections) {
      return;
    }
    const mappedSelections = selections.flatMap(({ start, end }) => {
      const posA = this.model?.getPositionAt(start);
      const posB = this.model?.getPositionAt(end);
      if (posA && posB) {
        return [[posA.lineNumber, posA.column, posB.lineNumber, posB.column]];
      } else {
        return [];
      }
    });

    if (
      mappedSelections &&
      mappedSelections?.length > 1 &&
      this.focusedEditor?.setSelections
    ) {
      return this.focusedEditor?.setSelections(
        mappedSelections.map(
          ([
            selectionStartLineNumber,
            positionColumn,
            positionLineNumber,
            selectionStartColumn,
          ]) => ({
            selectionStartColumn,
            selectionStartLineNumber,
            positionColumn,
            positionLineNumber,
          }),
        ),
      );
    }

    mappedSelections?.forEach(([a, b, c, d]) => {
      this.focusedEditor?.setSelection(new window.monaco.Selection(a, b, c, d));
    });
  }

  /**
   * Attempts to find an ancestor element with a Monaco-related CSS class.
   * @returns The found element or undefined.
   */
  private findAncestorWithMonacoClass() {
    return (
      this.getVisualElement() ||
      findAncestorWithClass(this.elem, 'editor-instance')
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
      return replaceNonBreakingSpaces(
        this.findAncestorWithMonacoClass()?.textContent || this.elem.value,
      );
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

  getPosition() {
    const positionData =
      this.focusedEditor?.getPosition() || this.getFallbackPosition();

    return {
      lineNumber: positionData?.lineNumber || 1,
      column: positionData?.column || 1,
    };
  }

  /**
   * Determines the file extension associated with the current language in the
     Monaco editor model.
   * @returns The file extension as a array of strings or null if not
     determinable.
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
   * Attaches a listener to the Monaco editor model's content change event. When
   * the content changes, the provided callback function is executed. The
   * callback receives an event object with the updated content of the editor.
   *
   * @param f - A callback function that will be invoked with an event object
     containing the updated content as soon as the editor's content changes.
   */
  bindChange(f: (...args: any[]) => void) {
    if (this.model?.onDidChangeContent) {
      const contentChangeListener = this.model.onDidChangeContent((e) => {
        if (!e.isFlush) {
          this.wrapSilence(f)();
        }
      });
      this.changeListener = contentChangeListener;
    }
  }

  /**
   * Removes the previously attached listener from the Monaco editor model's
   * content change event. After calling this method, changes to the content
   * will no longer invoke the callback function passed to `bindChange`.
   */
  unbindChange() {
    if (this.changeListener?.dispose) {
      this.changeListener.dispose();
    }
  }
  /**
   * Retrieves the closest parent element that matches the Monaco editor's container.
   * This is useful for operations requiring reference to the editor's DOM structure, such as
   * finding the cursor or line elements.
   *
   * @returns The found Monaco editor container element, or undefined if not found.
   */
  getVisualElement() {
    return this.elem?.closest('.monaco-editor');
  }

  /**
   * Provides a fallback position object with `lineNumber` and `column` when
   * the Monaco editor is unable to provide it directly, typically when the editor
   * hasn't fully initialized or in unusual state conditions. It estimates these
   * values based on the cursor's current position.
   *
   * @returns An object with `lineNumber` and `column`, estimated based on the cursor's current position.
   */
  private getFallbackPosition() {
    try {
      const lineNumber = this.estimateCurrentLineNumberByCursor();
      if (lineNumber) {
        const column = this.estimateCurrentColumnByCursor(lineNumber);
        return {
          lineNumber,
          column,
        };
      }
    } catch (error) {}
  }
  /**
   * Estimates the line number in the editor where the cursor is currently positioned.
   * This method finds the closest line to the cursor based on the vertical positioning
   * of the cursor element within the Monaco editor's content.
   *
   * @returns The estimated line number where the cursor is positioned, or null if it cannot be determined.
   */
  private estimateCurrentLineNumberByCursor() {
    const parentEl = this.getVisualElement();
    const cursorEl = parentEl?.querySelector('.cursor');
    if (!cursorEl || !parentEl) {
      return;
    }
    const cursorRect = cursorEl.getBoundingClientRect();

    // Find all line elements in the editor
    const lineElements = Array.from(
      parentEl.querySelectorAll('.view-lines .view-line'),
    );

    if (lineElements.length === 0) {
      return null;
    }
    const lineElementsSorted = lineElements.sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
    );

    // Iterate over sorted line elements to find the one nearest to the cursor
    let nearestDistance = Infinity;
    let nearestIdx: number | null = null;
    for (let i = 0; i < lineElementsSorted.length; i++) {
      const lineEl = lineElementsSorted[i];
      const lineRect = lineEl.getBoundingClientRect();

      // Using vertical distance primarily since we're interested in lines
      const distance = Math.abs(cursorRect.top - lineRect.top);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIdx = i + 1;
      }
    }

    return nearestIdx;
  }

  /**
   * Estimates the column number where the cursor is currently located within a given line.
   * This method relies on the visual positioning of the cursor element within the Monaco editor,
   * taking into consideration the tab size and the actual content up to the cursor's position.
   *
   * @param lineNumber - The line number for which to estimate the column.
   * @returns The estimated column number where the cursor is located.
   */
  private estimateCurrentColumnByCursor(lineNumber: number) {
    const parentEl = this.getVisualElement();
    const cursorEl = parentEl?.querySelector('.cursor');
    if (!cursorEl || !parentEl) {
      return 1;
    }
    const cursorRect = cursorEl.getBoundingClientRect();
    const lineElement = parentEl.querySelector(
      `.view-lines .view-line:nth-child(${lineNumber})`,
    );
    if (!lineElement) {
      return 1;
    }
    const lineRect = lineElement.getBoundingClientRect();
    const cursorPositionWithinLine = cursorRect.left - lineRect.left;

    // Use tabSize from the model's options

    const options = this.model?.getOptions();

    const tabSize = options?.tabSize || 4;

    // Account for tabs in the content up to the cursor position
    const contentUpToCursor = (
      this.model?.getLineContent(lineNumber) || ''
    ).substring(0, lineNumber);

    const numberOfTabsUpToCursor = (contentUpToCursor.match(/\t/g) || [])
      .length;
    const tabAdjustedPosition =
      cursorPositionWithinLine +
      tabSize *
        numberOfTabsUpToCursor *
        (lineRect.width / contentUpToCursor.length);

    let estimatedColumn =
      Math.floor(
        tabAdjustedPosition / (lineRect.width / contentUpToCursor.length),
      ) + 1;

    // Ensure the estimated column does not exceed the max column for the line
    const maxColumn = this.model?.getLineMaxColumn(lineNumber) || 1;
    estimatedColumn = Math.min(estimatedColumn, maxColumn);

    return estimatedColumn;
  }
}

export default InjectedMonacoHandler;
