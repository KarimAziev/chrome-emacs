jest.mock(
  'dummy-codemirror',
  () => ({
    __esModule: true,
    default: {
      modeInfo: [],
    },
  }),
  { virtual: true },
);

import InjectedCodeMirror6Handler from '@/handlers/injected/codemirror6';

type MockEditorView = {
  dom: HTMLDivElement;
  dispatch: jest.Mock;
  focus: jest.Mock;
  state: {
    doc: {
      length: number;
      toString: () => string;
      line: (lineNumber: number) => { from: number };
      lineAt: (offset: number) => { number: number; from: number };
    };
    selection: {
      main: {
        head: number;
      };
    };
  };
};

describe('InjectedCodeMirror6Handler', () => {
  const makeView = (text: string): MockEditorView => ({
    dom: document.createElement('div'),
    dispatch: jest.fn(),
    focus: jest.fn(),
    state: {
      doc: {
        length: text.length,
        toString: () => text,
        line: () => ({ from: 0 }),
        lineAt: () => ({ number: 1, from: 0 }),
      },
      selection: {
        main: {
          head: 0,
        },
      },
    },
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('refreshes the editor view when the same element points to a new view', async () => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('cm-editor');

    const elem = document.createElement('div') as HTMLDivElement & {
      cmView: { view: MockEditorView };
    };
    elem.cmView = { view: makeView('first file') };
    wrapper.appendChild(elem);
    document.body.appendChild(wrapper);

    const handler = new InjectedCodeMirror6Handler(elem as any, 'uuid');

    await handler.load();
    elem.cmView.view = makeView('second file');

    expect(handler.getValue()).toBe('second file');
  });

  it('emits change when a detached CodeMirror view is replaced', async () => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('cm-editor');

    const firstElem = document.createElement('div') as HTMLDivElement & {
      cmView: { view: MockEditorView };
    };
    firstElem.cmView = { view: makeView('first file') };
    wrapper.appendChild(firstElem);
    document.body.appendChild(wrapper);

    const handler = new InjectedCodeMirror6Handler(firstElem as any, 'uuid');
    const onChange = jest.fn();

    await handler.load();
    handler.bindChange(onChange);

    wrapper.removeChild(firstElem);

    const secondElem = document.createElement('div') as HTMLDivElement & {
      cmView: { view: MockEditorView };
    };
    secondElem.cmView = { view: makeView('second file') };
    wrapper.appendChild(secondElem);

    await Promise.resolve();
    await Promise.resolve();

    expect(onChange).toHaveBeenCalled();
    expect(handler.getValue()).toBe('second file');
  });
});
