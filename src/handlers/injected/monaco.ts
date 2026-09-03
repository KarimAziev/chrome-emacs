import type { editor, IDisposable } from 'monaco-editor';
import { fileExtensionsByLanguage } from '@/handlers/config/monaco';
import { isFunction, isString, isNumber } from '@/util/guard';
import { UpdateTextPayload } from '@/handlers/types';
import { ElementEventMonitor } from '@/util/event-monitor';
import { log } from '@/util/log';
import { generateStringHash } from '@/util/string';
import MonacoBase from '@/handlers/injected/monaco-base';
import { ChangeChunk, getTextChangeChunks } from '@/util/diff-util';

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
 * Handler for injecting Monaco Editor when monaco API is available globally.
 */
class InjectedMonacoHandler extends MonacoBase {
  /**
   * Represents the monaco editor instance. This is undefined if Monaco has not been initialized.
   */
  editor?: typeof window.monaco.editor | ReturnType<typeof editor.create>;
  /**
   * The text model representing the content within the Monaco editor. This model provides
   * functionalities such as setting/getting value, observing changes etc.
   */
  model: ExtendedModel | null = null;
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
  changeListeners: IDisposable[] = [];
  changeHandler?: (...args: any[]) => void;
  targetObserver?: MutationObserver;
  targetRefreshScheduled = false;
  targetId?: string;
  originalEditorElement?: HTMLDivElement;
  originalEditorContainer?: HTMLElement;
  private targetResolved = true;

  /**
   * Stores the original CSS `display` property of the `.monaco-editor` element to restore it upon cleanup.
   */
  originalDisplayStyle?: string;
  /**
   * Represents the newly created DOM element that the Monaco editor instance is injected into
   */
  injectedEditorElement?: HTMLDivElement;

  elementEventMonitor: ElementEventMonitor;
  /**
   * Constructs an instance of InjectedMonacoHandler.
   * @param elem - The HTMLTextAreaElement to be enhanced.
   * @param uuid - An identifier for the instance.
   */
  constructor(
    elem: HTMLTextAreaElement,
    uuid: string,
    focusedEditor?: editor.ICodeEditor,
  ) {
    super(elem, uuid);
    this.silenced = false;
    this.focusedEditor = focusedEditor;
  }

  private getEditors() {
    const editors =
      isFunction(window.monaco?.editor?.getEditors) &&
      window.monaco.editor.getEditors();

    return Array.isArray(editors) ? editors : [];
  }

  private getModelUri(model?: editor.ITextModel | null) {
    try {
      return model?.uri?.toString();
    } catch (error) {
      return '<unreadable>';
    }
  }

  private describeElement(element?: Element | null) {
    if (!element) {
      return null;
    }

    const htmlElement = element as HTMLElement;
    const directMonacoChildren = Array.from(element.children)
      .filter((child) => child.matches('.monaco-editor'))
      .map((child) => {
        const childElement = child as HTMLElement;

        return {
          className: childElement.className,
          connected: childElement.isConnected,
          display: childElement.style.display,
          modeId: childElement.dataset.modeId,
          role: childElement.getAttribute('role'),
          uri: childElement.dataset.uri,
        };
      });

    return {
      tagName: element.tagName,
      className: htmlElement.className,
      connected: element.isConnected,
      display: htmlElement.style.display,
      keybindingContext: htmlElement.dataset.keybindingContext,
      modeId: htmlElement.dataset.modeId,
      role: element.getAttribute('role'),
      uri: htmlElement.dataset.uri,
      directMonacoChildren,
    };
  }

  private getKnownModelUris() {
    const monacoEditor = this.editor as typeof window.monaco.editor | undefined;
    if (!isFunction(monacoEditor?.getModels)) {
      return { count: 0, uris: [] as Array<string | undefined> };
    }

    const models = monacoEditor.getModels();
    return {
      count: models.length,
      uris: models.slice(0, 25).map((model) => this.getModelUri(model)),
    };
  }

  private logTarget(event: string, details: Record<string, unknown> = {}) {
    if (!process.env.DEBUG) {
      return;
    }

    const knownModels = this.getKnownModelUris();

    log(
      'monaco-target',
      event,
      JSON.stringify({
        uuid: this.uuid,
        hacked: !!this.originalEditorElement,
        targetResolved: this.targetResolved,
        targetId: this.targetId,
        uriCandidates: this.getUriCandidates(),
        handlerModelUri: this.getModelUri(this.model),
        focusedEditorModelUri: this.getModelUri(this.getCurrentEditorModel()),
        knownModelCount: knownModels.count,
        knownModelUris: knownModels.uris,
        originalEditor: this.describeElement(this.originalEditorElement),
        originalContainer: this.describeElement(this.originalEditorContainer),
        visualEditor: this.describeElement(this.getVisualElement()),
        injectedEditor: this.describeElement(this.injectedEditorElement),
        ...details,
      }),
    );
  }

  private getUriCandidates() {
    const originalEditor = this.originalEditorElement;
    const visualEditor = this.getVisualElement();
    const values = [
      originalEditor?.isConnected ? originalEditor.dataset?.uri : undefined,
      originalEditor?.isConnected
        ? originalEditor.closest<HTMLElement>('[data-uri]')?.dataset?.uri
        : undefined,
      this.originalEditorContainer?.dataset?.uri,
      this.originalEditorContainer?.closest<HTMLElement>('[data-uri]')?.dataset
        ?.uri,
      visualEditor?.isConnected ? this.getUri() : undefined,
    ];

    return Array.from(new Set(values.filter(isString)));
  }

  private getModelByUri() {
    if (!this.editor?.getModel) {
      return null;
    }

    for (const uri of this.getUriCandidates()) {
      const model = this.editor.getModel(
        uri as unknown as editor.ITextModel['uri'],
      ) as ExtendedModel | null;

      if (model) {
        return model;
      }
    }

    return null;
  }

  private refreshInjectedEditorElement() {
    const editorElement = this.focusedEditor?.getDomNode?.();
    if (
      editorElement instanceof HTMLDivElement &&
      editorElement.isConnected &&
      editorElement.parentElement === this.originalEditorContainer &&
      editorElement.matches('.monaco-editor')
    ) {
      this.injectedEditorElement = editorElement;
    }

    return this.injectedEditorElement;
  }

  private refreshOriginalEditorElement() {
    const container = this.originalEditorContainer;
    const currentOriginal = this.originalEditorElement;
    if (!container || !currentOriginal) {
      return false;
    }

    const injectedEditor = this.refreshInjectedEditorElement();
    if (currentOriginal.isConnected) {
      return false;
    }

    const currentModelUri = this.getModelUri(this.getCurrentEditorModel());
    const candidates = Array.from(
      container.querySelectorAll<HTMLDivElement>(
        ':scope > .monaco-editor[role="code"]',
      ),
    ).filter(
      (candidate) =>
        candidate !== injectedEditor &&
        candidate !== currentOriginal &&
        !!candidate.querySelector('textarea'),
    );

    const replacement =
      candidates.find(
        (candidate) =>
          !!candidate.dataset.uri && candidate.dataset.uri !== currentModelUri,
      ) || candidates[0];

    if (!replacement) {
      if (!currentOriginal.isConnected) {
        this.targetResolved = false;
      }
      return false;
    }

    const replacementTextarea =
      replacement.querySelector<HTMLTextAreaElement>('textarea');
    if (!replacementTextarea) {
      return false;
    }

    this.originalEditorElement = replacement;
    this.originalDisplayStyle = replacement.style.display;
    this.elem = replacementTextarea;
    replacement.style.display = 'none';

    this.logTarget('original-editor-replaced', {
      previousOriginal: this.describeElement(currentOriginal),
      replacementOriginal: this.describeElement(replacement),
    });

    return true;
  }

  private getCurrentEditorModel() {
    const model = this.focusedEditor?.getModel?.();
    return (model as ExtendedModel | null | undefined) || null;
  }

  private refreshActiveEditor() {
    const uri = this.getUri();
    const visual = this.getVisualElement();
    const editors = this.getEditors();

    const editorByDom =
      visual &&
      editors.find((candidate) => {
        const domNode = candidate.getDomNode?.();
        return !!domNode && (domNode === visual || visual.contains(domNode));
      });

    const editorByUri =
      uri &&
      editors.find(
        (candidate) => candidate.getModel?.()?.uri?.toString() === uri,
      );

    this.focusedEditor = editorByDom || editorByUri || this.focusedEditor;

    return this.focusedEditor;
  }

  private refreshModel(preferOriginalModel = false) {
    this.refreshActiveEditor();

    if (this.originalEditorElement) {
      if (preferOriginalModel) {
        return this.refreshHackedTarget();
      }

      if (!this.targetResolved) {
        return null;
      }

      const currentModel = this.getCurrentEditorModel() || this.model;
      this.model = currentModel || null;
      return this.model;
    }

    const currentEditorModel = this.getCurrentEditorModel();
    const uriModel = this.getModelByUri();
    const currentModel = currentEditorModel || uriModel || this.model;

    this.model = currentModel || null;

    return this.model;
  }

  private getOriginalEditorModel() {
    const uri = this.getUriCandidates().find(isString);
    if (!uri || !this.editor?.getModel) {
      return null;
    }

    return this.editor.getModel(
      uri as unknown as editor.ITextModel['uri'],
    ) as ExtendedModel | null;
  }

  private refreshHackedTarget() {
    const model = this.getOriginalEditorModel();
    if (!model) {
      this.targetResolved = false;
      this.logTarget('target-unresolved');
      return null;
    }

    const currentModel = this.getCurrentEditorModel();
    this.targetResolved = true;

    if (model !== currentModel && this.focusedEditor?.setModel) {
      this.logTarget('set-synthetic-model', {
        fromModelUri: this.getModelUri(currentModel),
        toModelUri: this.getModelUri(model),
      });
      this.focusedEditor.setModel(model);
      this.refreshInjectedEditorElement();
    }

    this.model = model;
    return this.model;
  }

  private getTargetId() {
    if (!this.targetResolved) {
      return undefined;
    }

    const editorId = this.focusedEditor?.getId?.() || '';
    const modelId = this.model?.uri?.toString() || this.getUri() || '';

    return editorId || modelId ? `${editorId}:${modelId}` : undefined;
  }

  private syncTargetListeners(notify = false) {
    const previousTargetId = this.targetId;
    const model = this.refreshModel(true);
    const nextTargetId = model ? this.getTargetId() : undefined;
    const targetChanged = previousTargetId !== nextTargetId;

    this.targetId = nextTargetId;

    this.logTarget('sync-target', {
      notify,
      previousTargetId,
      nextTargetId,
      targetChanged,
      resolvedModelUri: this.getModelUri(model),
      hasChangeHandler: !!this.changeHandler,
    });

    if (targetChanged && this.changeHandler) {
      this.bindChange(this.changeHandler);

      if (notify && model) {
        this.wrapSilence(this.changeHandler)();
      }
    }

    return targetChanged;
  }

  private observeTargetChanges() {
    this.targetObserver?.disconnect();

    const observedElements = new Set(
      [
        this.originalEditorElement,
        this.originalEditorContainer,
        this.getVisualElement(),
      ].filter((element): element is HTMLElement => !!element),
    );

    if (observedElements.size === 0) {
      return;
    }

    this.targetObserver = new MutationObserver((records) => {
      const originalEditorReplaced = this.refreshOriginalEditorElement();

      this.logTarget('target-mutation', {
        originalEditorReplaced,
        records: records.map((record) => ({
          type: record.type,
          attributeName: record.attributeName,
          target: this.describeElement(
            record.target instanceof Element ? record.target : null,
          ),
          added: Array.from(record.addedNodes)
            .filter((node): node is Element => node instanceof Element)
            .map((node) => this.describeElement(node)),
          removed: Array.from(record.removedNodes)
            .filter((node): node is Element => node instanceof Element)
            .map((node) => this.describeElement(node)),
        })),
      });

      if (this.targetRefreshScheduled) {
        return;
      }

      this.targetRefreshScheduled = true;
      queueMicrotask(() => {
        this.targetRefreshScheduled = false;
        this.syncTargetListeners(true);
      });
    });

    observedElements.forEach((element) => {
      this.targetObserver?.observe(element, {
        attributes: true,
        attributeFilter: [
          'data-keybinding-context',
          'data-mode-id',
          'data-uri',
        ],
        childList: element === this.originalEditorContainer,
      });
    });

    this.logTarget('observer-attached', {
      observedElements: Array.from(observedElements).map((element) =>
        this.describeElement(element),
      ),
    });
  }

  /**
   * Initializes the Monaco editor variables and active editor if possible.
   * @returns A promise indicating the completion of the loading process.
   */

  async load() {
    return new Promise<void>((resolve) => {
      try {
        this.editor = window?.monaco?.editor;
        this.logTarget('load-start', {
          api: {
            create: isFunction(window?.monaco?.editor?.create),
            getEditors: isFunction(window?.monaco?.editor?.getEditors),
            getModel: isFunction(window?.monaco?.editor?.getModel),
            getModels: isFunction(window?.monaco?.editor?.getModels),
          },
        });
        this.refreshModel();
        this.targetId = this.getTargetId();

        if (this.editor) {
          const editors = this.getEditors();

          if (editors.length > 0) {
            this.logTarget('use-existing-editor', {
              editorCount: editors.length,
            });
            this.refreshActiveEditor();
          } else {
            this.logTarget('use-hack-monaco', {
              editorCount: editors.length,
            });
            this.hackMonaco();
          }

          if (
            this.focusedEditor?.hasTextFocus &&
            !this.focusedEditor?.hasTextFocus()
          ) {
            this.focusedEditor?.focus();
          }
        }

        this.logTarget('load-complete');
      } catch (error) {
        this.logTarget('load-error', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw new Error('Monaco editor is not available.');
      } finally {
        return resolve();
      }
    });
  }
  /**
   * The `hackMonaco` method provides a workaround for reinitializing the Monaco
   * editor with its previously associated model in a manner that preserves the
   * editor's state, including text content and configurations.
   *
   * ### Key Steps:
   * - **Visibility Adjustment**:
   *   This method hides the exisiting `.monaco-editor` DOM element by setting its
   *   display style to 'none'.
   *
   * - **Model Retention**: It maintains the model from the original Monaco editor,
   *   ensuring that all text and editor configurations remain intact.
   *
   * - **Editor Reinitialization**: A new Monaco editor instance is created and
   *   inserted into the DOM. This instance is initialized with the preserved
   *   model, effectively maintaining continuity in the editor's content and settings.
   *
   * - **Event Management**: Leveraging `ElementEventMonitor`, any additional DOM
   *   listeners introduced during editor reinitialization are managed to ensure
   *   a clean integration without interference from unwanted event handlers.
   *
   * - **State and Cursor Management**: While the text model retains content and
   *   settings, this approach also attempts to minimally disrupt the user's
   *   interaction state, including cursor position and text selections, through
   *   careful management during the reinitialization process.
   *
   * - **DOM Cleanup on Unload**: Upon unloading or disposing of the editor, the
   *   method ensures proper cleanup of the newly created editor instance and
   *   restores the visibility of the original editor element to its previous state,
   *   ensuring no residual impact on the DOM.
   *
   */
  private hackMonaco() {
    const el = this.getVisualElement();
    if (!el) {
      this.logTarget('hack-no-visual-element');
      return;
    }

    const value = this.model?.getValue();
    const position = this.getFallbackPosition();

    const parent = el?.parentElement;

    this.logTarget('hack-start', {
      candidateOriginalEditor: this.describeElement(el),
      candidateContainer: this.describeElement(parent),
    });

    if (parent) {
      this.originalEditorElement = el;
      this.originalEditorContainer = parent;
      this.originalDisplayStyle = el.style.display;

      el.style.display = 'none';

      this.elementEventMonitor = new ElementEventMonitor(parent);
      this.elementEventMonitor.start();

      this.focusedEditor = window.monaco.editor.create(parent as HTMLElement, {
        model: this.model,
        automaticLayout: true,
        value,
      });
      this.refreshModel();

      const injectedChild =
        this.focusedEditor?.getDomNode?.() ||
        Array.from(parent.children).find(
          (child) => child !== el && child.matches('.monaco-editor'),
        );
      if (injectedChild) {
        this.injectedEditorElement = injectedChild as HTMLDivElement;
      }

      this.logTarget('hack-complete');

      if (position) {
        try {
          this.focusedEditor?.setPosition(position);
        } catch (err) {}
      }
    }
  }

  onUnload() {
    this.unbindChange();

    if (this.focusedEditor) {
      try {
        this.focusedEditor.focus();
      } catch (error) {
        log('onUnload error', error);
      }
    }

    if (this.injectedEditorElement) {
      const parentEl = this.getVisualElement()?.parentElement;

      parentEl?.childNodes.forEach((child) => {
        if (this.injectedEditorElement === child) {
          child.remove();
        } else if ((child as HTMLElement).style.display === 'none') {
          (child as HTMLElement).style.display =
            this.originalDisplayStyle || '';
        }
      });
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
    const model = this.refreshModel();
    if (!model) {
      this.logTarget('write-rejected-no-target', {
        incomingLength: value.length,
        incomingHash: process.env.DEBUG
          ? generateStringHash(value)
          : '<debug-disabled>',
      });
      return;
    }

    this.logTarget('write-accepted', {
      incomingLength: value.length,
      incomingHash: process.env.DEBUG
        ? generateStringHash(value)
        : '<debug-disabled>',
      writeModelUri: this.getModelUri(model),
    });

    this.executeSilenced(() => {
      this.applyTextChanges(value);
      this.setPosition(options);
    });
  }

  private _getTextChanges(
    value: string,
  ): editor.IIdentifiedSingleEditOperation[] | null {
    const model = this.refreshModel();
    if (!model) {
      return null;
    }

    const changes = getTextChangeChunks(this.getValue(), value);
    if (!changes) {
      return null;
    }

    return changes.map((change) => this.mapChangeToEdit(model, change));
  }

  private mapChangeToEdit(
    model: ExtendedModel,
    change: ChangeChunk,
  ): editor.IIdentifiedSingleEditOperation {
    const start = model.getPositionAt(change.from);
    const end = model.getPositionAt(change.to);

    return {
      range: {
        startLineNumber: start.lineNumber,
        startColumn: start.column,
        endLineNumber: end.lineNumber,
        endColumn: end.column,
      },
      text: change.insert,
      forceMoveMarkers: true,
    };
  }

  private applyTextChanges(value: string): void {
    const edits = this._getTextChanges(value);
    if (!edits || edits.length === 0) {
      return;
    }

    if (this.focusedEditor?.executeEdits) {
      this.focusedEditor.pushUndoStop?.();
      this.focusedEditor.executeEdits('chrome-emacs', edits);
      this.focusedEditor.pushUndoStop?.();
      return;
    }

    const model = this.model;

    if (model?.pushEditOperations) {
      model.pushStackElement?.();
      model.pushEditOperations(null, edits, () => null);
      model.pushStackElement?.();
      return;
    }

    if (model && isString(value)) {
      model.setValue(value);
    }
  }

  /**
   * Sets the cursor position within the editor or textarea, based on the
     provided options.
   * @param options - Options with position and selection data
   */
  private setPosition(options?: UpdateTextPayload) {
    this.refreshModel();
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

      if (this.focusedEditor?.revealPositionInCenterIfOutsideViewport) {
        this.focusedEditor.revealPositionInCenterIfOutsideViewport(position);
      } else if (this.focusedEditor?.revealPosition) {
        this.focusedEditor.revealPosition(position);
      }
      if (
        this.focusedEditor?.hasTextFocus &&
        !this.focusedEditor?.hasTextFocus()
      ) {
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
    this.refreshModel();
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

    if (!window?.monaco?.Selection || mappedSelections.length > 1) {
      return this.focusedEditor?.setSelections(
        mappedSelections.map(
          ([
            selectionStartLineNumber,
            selectionStartColumn,
            positionLineNumber,
            positionColumn,
          ]) => ({
            selectionStartColumn,
            selectionStartLineNumber,
            positionColumn,
            positionLineNumber,
          }),
        ),
      );
    }

    if (window.monaco?.Selection) {
      mappedSelections?.forEach(([a, b, c, d]) => {
        this.focusedEditor?.setSelection(
          new window.monaco.Selection(a, b, c, d),
        );
      });
    }
  }

  /**
   * Retrieves the current value from the Monaco editor or model
   * @returns The current value as a string.
   */
  getValue() {
    if (!this.refreshModel()) {
      return '';
    }

    return this.focusedEditor?.getValue() || this.model?.getValue() || '';
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
    this.refreshModel();
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
    this.refreshModel();
    const language = this.getModelLanguageId();

    const languages =
      isFunction(window.monaco?.languages?.getLanguages) &&
      window.monaco?.languages?.getLanguages();

    if (language && Array.isArray(languages)) {
      const found = languages.find((lang) => lang?.id === language);
      return found?.extensions;
    }

    if (language && fileExtensionsByLanguage[language]) {
      return fileExtensionsByLanguage[language];
    }

    return super.getExtension();
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
    this.changeHandler = f;
    this.unbindChange();
    const model = this.refreshModel();
    this.targetId = this.getTargetId();

    this.logTarget('bind-change', {
      boundModelUri: this.getModelUri(model),
    });

    const notifyChange = this.wrapSilence(() => {
      const refreshedModel = this.refreshModel();
      if (refreshedModel) {
        this.logTarget('emit-change', {
          emittedModelUri: this.getModelUri(refreshedModel),
        });
        f();
      } else {
        this.logTarget('suppress-change-no-target');
      }
    });

    if (model && this.focusedEditor?.onDidChangeModelContent) {
      this.changeListeners.push(
        this.focusedEditor.onDidChangeModelContent((e) => {
          if (!e.isFlush) {
            notifyChange();
          }
        }),
      );
    } else if (model && this.model?.onDidChangeContent) {
      this.changeListeners.push(
        this.model.onDidChangeContent((e) => {
          if (!e.isFlush) {
            notifyChange();
          }
        }),
      );
    }

    if (model && this.focusedEditor?.onDidChangeModel) {
      this.changeListeners.push(
        this.focusedEditor.onDidChangeModel(() => {
          if (!this.syncTargetListeners(true)) {
            notifyChange();
          }
        }),
      );
    }

    this.observeTargetChanges();
  }

  /**
   * Removes the previously attached listener from the Monaco editor model's
   * content change event. After calling this method, changes to the content
   * will no longer invoke the callback function passed to `bindChange`.
   */
  unbindChange() {
    this.changeListeners.forEach((listener) => listener.dispose?.());
    this.changeListeners = [];
    this.targetObserver?.disconnect();
    this.targetObserver = undefined;
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
    const linesElements = Array.from(
      parentEl.querySelectorAll<HTMLElement>('.view-lines .view-line'),
    );
    if (linesElements.length === 0) {
      return null;
    }

    const lineElementsSorted = linesElements.sort(
      (a, b) => parseFloat(a.style?.top) - parseFloat(b.style?.top),
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

    if (isNumber(nearestIdx)) {
      const strs = lineElementsSorted.map((el) =>
        (el.textContent || '').replace(/\u00A0/g, ' '),
      );

      const idx = nearestIdx - 1;
      const strsBefore = idx > 0 ? strs.slice(0, idx) : [];
      const strsAfter = strs.slice(idx + 1);
      const currLineStr = strs[idx];

      const value = this.model?.getValue();

      const valueLines = value?.split('\n').map((line) => ({
        text: line,
        hash: generateStringHash(line),
      }));
      const currLineHash = generateStringHash(currLineStr);

      const realIdx = valueLines?.findIndex((v, i) => {
        const isFound = v.hash === currLineHash;
        if (isFound) {
          const blen = strsBefore.length;
          const fromIdx = i - blen;

          const vBefore = fromIdx >= 0 ? valueLines.slice(fromIdx, i) : [];
          const vAfter = valueLines.slice(i + 1);

          return (
            strsBefore.every(
              (s, bi) => generateStringHash(s) === vBefore[bi]?.hash,
            ) &&
            strsAfter.every(
              (s, bi) => generateStringHash(s) === vAfter[bi]?.hash,
            )
          );
        }
        return false;
      });

      if (isNumber(realIdx)) {
        return realIdx + 1;
      }

      const visibleLen = linesElements.length;

      const extraIdx = valueLines ? valueLines.length - visibleLen : 0;

      nearestIdx += extraIdx;
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
    const lineElement = document.elementFromPoint(
      cursorRect.left - 2,
      cursorRect.top,
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
