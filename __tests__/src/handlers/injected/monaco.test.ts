import InjectedMonacoHandler from '@/handlers/injected/monaco';

describe('InjectedMonacoHandler', () => {
  let textarea: HTMLTextAreaElement;
  let host: HTMLDivElement;
  let container: HTMLDivElement;
  let currentModel: any;
  let modelChangeListeners: Array<() => void>;
  let contentChangeListeners: Array<(event: { isFlush: boolean }) => void>;
  let editorInstance: any;

  const makeModel = (value: string, uri: string) => ({
    uri: {
      toString: () => uri,
    },
    getValue: jest.fn(() => value),
    getPositionAt: jest.fn((offset: number) => ({
      lineNumber: 1,
      column: offset + 1,
    })),
    getLanguageId: jest.fn(() => 'typescript'),
    onDidChangeContent: jest.fn(() => ({
      dispose: jest.fn(),
    })),
    pushEditOperations: jest.fn(),
    pushStackElement: jest.fn(),
    getOptions: jest.fn(() => ({ tabSize: 2 })),
    getLineContent: jest.fn(() => value),
    getLineMaxColumn: jest.fn(() => value.length + 1),
  });

  beforeEach(() => {
    modelChangeListeners = [];
    contentChangeListeners = [];

    textarea = document.createElement('textarea');
    host = document.createElement('div');
    container = document.createElement('div');
    container.classList.add('monaco-editor');
    container.dataset.uri = 'file:///first.ts';
    container.appendChild(textarea);
    host.appendChild(container);
    document.body.appendChild(host);

    currentModel = makeModel('hello world', 'file:///first.ts');

    editorInstance = {
      getDomNode: jest.fn(() => container),
      getModel: jest.fn(() => currentModel),
      getId: jest.fn(() => 'editor-1'),
      getValue: jest.fn(() => currentModel.getValue()),
      executeEdits: jest.fn(),
      pushUndoStop: jest.fn(),
      hasTextFocus: jest.fn(() => true),
      focus: jest.fn(),
      getPosition: jest.fn(() => ({
        lineNumber: 1,
        column: 1,
      })),
      setPosition: jest.fn(),
      revealPositionInCenterIfOutsideViewport: jest.fn(),
      revealPosition: jest.fn(),
      setSelection: jest.fn(),
      setSelections: jest.fn(),
      onDidChangeModelContent: jest.fn(
        (listener: (event: { isFlush: boolean }) => void) => {
          contentChangeListeners.push(listener);
          return { dispose: jest.fn() };
        },
      ),
      onDidChangeModel: jest.fn((listener: () => void) => {
        modelChangeListeners.push(listener);
        return { dispose: jest.fn() };
      }),
    };

    (window as any).monaco = {
      editor: {
        getEditors: jest.fn(() => [editorInstance]),
        getModel: jest.fn(() => currentModel),
      },
      languages: {
        getLanguages: jest.fn(() => []),
      },
      Selection: class Selection {
        constructor(
          public selectionStartLineNumber: number,
          public selectionStartColumn: number,
          public positionLineNumber: number,
          public positionColumn: number,
        ) {}
      },
    };
  });

  afterEach(() => {
    delete (window as any).monaco;
    document.body.innerHTML = '';
  });

  it('applies incremental edits through executeEdits', async () => {
    const handler = new InjectedMonacoHandler(textarea, 'uuid', editorInstance);

    await handler.load();
    handler.setValue('hello brave world');

    expect(editorInstance.executeEdits).toHaveBeenCalledWith('chrome-emacs', [
      {
        range: {
          startLineNumber: 1,
          startColumn: 7,
          endLineNumber: 1,
          endColumn: 7,
        },
        text: 'brave ',
        forceMoveMarkers: true,
      },
    ]);
    expect(editorInstance.pushUndoStop).toHaveBeenCalledTimes(2);
  });

  it('rebinds and emits change when the Monaco model switches', async () => {
    const handler = new InjectedMonacoHandler(textarea, 'uuid', editorInstance);
    const onChange = jest.fn();

    await handler.load();
    handler.bindChange(onChange);

    currentModel = makeModel('second file', 'file:///second.ts');
    container.dataset.uri = 'file:///second.ts';
    modelChangeListeners[0]();

    expect(onChange).toHaveBeenCalled();
    expect(handler.model).toBe(currentModel);
    expect(handler.getValue()).toBe('second file');
  });

  it('updates the injected Monaco model when hackMonaco host attributes change', async () => {
    const firstModel = currentModel;
    const secondModel = makeModel('second file\nline two', 'file:///second.ts');
    let syntheticModel = firstModel;

    const syntheticEditor = {
      getModel: jest.fn(() => syntheticModel),
      getId: jest.fn(() => 'synthetic-editor'),
      getValue: jest.fn(() => syntheticModel.getValue()),
      setModel: jest.fn((model: any) => {
        syntheticModel = model;
      }),
      executeEdits: jest.fn(),
      pushUndoStop: jest.fn(),
      hasTextFocus: jest.fn(() => true),
      focus: jest.fn(),
      getPosition: jest.fn(() => ({
        lineNumber: 1,
        column: 1,
      })),
      setPosition: jest.fn(),
      revealPositionInCenterIfOutsideViewport: jest.fn(),
      revealPosition: jest.fn(),
      setSelection: jest.fn(),
      setSelections: jest.fn(),
      onDidChangeModelContent: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChangeModel: jest.fn(() => ({ dispose: jest.fn() })),
    };

    (window as any).monaco.editor.getEditors = jest.fn(() => false);
    (window as any).monaco.editor.getModel = jest.fn((uri: any) => {
      const uriString = uri?.toString?.() || uri;
      if (uriString === 'file:///first.ts') {
        return firstModel;
      }
      if (uriString === 'file:///second.ts') {
        return secondModel;
      }
      return null;
    });
    (window as any).monaco.editor.create = jest.fn(() => {
      const injected = document.createElement('div');
      injected.classList.add('monaco-editor');
      host.appendChild(injected);
      return syntheticEditor;
    });

    const handler = new InjectedMonacoHandler(textarea, 'uuid');
    const onChange = jest.fn();

    await handler.load();
    handler.bindChange(onChange);

    container.dataset.uri = 'file:///second.ts';

    await Promise.resolve();
    await Promise.resolve();

    expect(syntheticEditor.setModel).toHaveBeenCalledWith(secondModel);
    expect(handler.model).toBe(secondModel);
    expect(onChange).toHaveBeenCalled();
  });

  it('tracks host and injected Monaco replacements across a round trip', async () => {
    const firstModel = currentModel;
    const secondModel = makeModel('second file', 'file:///second.ts');
    let syntheticModel = firstModel;
    let syntheticRoot: HTMLDivElement;

    const makeSyntheticRoot = () => {
      const root = document.createElement('div');
      root.classList.add('monaco-editor');
      root.dataset.uri = syntheticModel.uri.toString();
      root.setAttribute('role', 'code');
      root.appendChild(document.createElement('textarea'));
      return root;
    };

    const syntheticEditor = {
      getDomNode: jest.fn(() => syntheticRoot),
      getModel: jest.fn(() => syntheticModel),
      getId: jest.fn(() => 'synthetic-editor'),
      getValue: jest.fn(() => syntheticModel.getValue()),
      setModel: jest.fn((model: any) => {
        syntheticModel = model;
        syntheticRoot.remove();
        syntheticRoot = makeSyntheticRoot();
        host.appendChild(syntheticRoot);
      }),
      executeEdits: jest.fn((_source: string, edits: any[]) =>
        syntheticModel.pushEditOperations(null, edits, () => null),
      ),
      pushUndoStop: jest.fn(),
      hasTextFocus: jest.fn(() => true),
      focus: jest.fn(),
      getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
      setPosition: jest.fn(),
      revealPositionInCenterIfOutsideViewport: jest.fn(),
      revealPosition: jest.fn(),
      setSelection: jest.fn(),
      setSelections: jest.fn(),
      onDidChangeModelContent: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChangeModel: jest.fn(() => ({ dispose: jest.fn() })),
    };

    (window as any).monaco.editor.getEditors = jest.fn(() => false);
    (window as any).monaco.editor.getModel = jest.fn((uri: any) => {
      const uriString = uri?.toString?.() || uri;
      if (uriString === 'file:///first.ts') {
        return firstModel;
      }
      if (uriString === 'file:///second.ts') {
        return secondModel;
      }
      return null;
    });
    (window as any).monaco.editor.create = jest.fn(() => {
      syntheticRoot = makeSyntheticRoot();
      host.appendChild(syntheticRoot);
      return syntheticEditor;
    });

    const handler = new InjectedMonacoHandler(textarea, 'uuid');
    const onChange = jest.fn();

    await handler.load();
    handler.bindChange(onChange);

    const replacement = document.createElement('div');
    replacement.classList.add('monaco-editor');
    replacement.dataset.uri = 'file:///second.ts';
    replacement.setAttribute('role', 'code');
    const replacementTextarea = document.createElement('textarea');
    replacement.appendChild(replacementTextarea);

    container.remove();

    await Promise.resolve();
    await Promise.resolve();

    handler.setValue('must not be written while the target is missing');

    expect(firstModel.pushEditOperations).not.toHaveBeenCalled();

    host.appendChild(replacement);

    await Promise.resolve();
    await Promise.resolve();

    expect(handler.originalEditorElement).toBe(replacement);
    expect(handler.elem).toBe(replacementTextarea);
    expect(replacement.style.display).toBe('none');
    expect(syntheticEditor.setModel).toHaveBeenCalledWith(secondModel);
    expect(handler.model).toBe(secondModel);
    expect(onChange).toHaveBeenCalled();

    handler.setValue('updated second file');

    expect(secondModel.pushEditOperations).toHaveBeenCalled();
    expect(firstModel.pushEditOperations).not.toHaveBeenCalled();

    const returnReplacement = document.createElement('div');
    returnReplacement.classList.add('monaco-editor');
    returnReplacement.dataset.uri = 'file:///first.ts';
    returnReplacement.setAttribute('role', 'code');
    const returnTextarea = document.createElement('textarea');
    returnReplacement.appendChild(returnTextarea);

    replacement.remove();
    host.appendChild(returnReplacement);

    await Promise.resolve();
    await Promise.resolve();

    expect(handler.originalEditorElement).toBe(returnReplacement);
    expect(handler.elem).toBe(returnTextarea);
    expect(returnReplacement.style.display).toBe('none');
    expect(syntheticEditor.setModel).toHaveBeenLastCalledWith(firstModel);
    expect(handler.model).toBe(firstModel);

    handler.setValue('updated first file');

    expect(firstModel.pushEditOperations).toHaveBeenCalled();
  });

  it('refuses writes when a hackMonaco target has no model identity', async () => {
    const firstModel = currentModel;
    let syntheticModel = firstModel;
    const syntheticEditor = {
      getModel: jest.fn(() => syntheticModel),
      getId: jest.fn(() => 'synthetic-editor'),
      getValue: jest.fn(() => syntheticModel.getValue()),
      setModel: jest.fn((model: any) => {
        syntheticModel = model;
      }),
      executeEdits: jest.fn(),
      pushUndoStop: jest.fn(),
      hasTextFocus: jest.fn(() => true),
      focus: jest.fn(),
      getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
      setPosition: jest.fn(),
      revealPositionInCenterIfOutsideViewport: jest.fn(),
      revealPosition: jest.fn(),
      setSelection: jest.fn(),
      setSelections: jest.fn(),
      onDidChangeModelContent: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChangeModel: jest.fn(() => ({ dispose: jest.fn() })),
    };

    (window as any).monaco.editor.getEditors = jest.fn(() => false);
    (window as any).monaco.editor.create = jest.fn(() => {
      const injected = document.createElement('div');
      injected.classList.add('monaco-editor');
      host.appendChild(injected);
      return syntheticEditor;
    });

    const handler = new InjectedMonacoHandler(textarea, 'uuid');
    await handler.load();
    handler.bindChange(jest.fn());

    container.removeAttribute('data-uri');
    await Promise.resolve();
    await Promise.resolve();

    handler.setValue('must not be written');

    expect(syntheticEditor.executeEdits).not.toHaveBeenCalled();
    expect(firstModel.pushEditOperations).not.toHaveBeenCalled();
  });
});
