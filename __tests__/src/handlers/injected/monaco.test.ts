import InjectedMonacoHandler from '@/handlers/injected/monaco';

describe('InjectedMonacoHandler', () => {
  let textarea: HTMLTextAreaElement;
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
    container = document.createElement('div');
    container.classList.add('monaco-editor');
    container.dataset.uri = 'file:///first.ts';
    container.appendChild(textarea);
    document.body.appendChild(container);

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
});
