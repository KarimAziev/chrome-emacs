import InjectorHandler from '@/handlers/injector';
import BaseHandler from '@/handlers/base';
import { IContentEventsBinder } from '@/handlers/types';

jest.mock('uuid', () => ({
  v4: () => '1234-uuid',
}));

const createElementInDocument = (): HTMLElement => {
  document.body.innerHTML = `<textarea />`;
  return document.body.firstChild as HTMLElement;
};

class MockContentEventsBinder implements IContentEventsBinder {
  bind = jest.fn();
}

const MOCK_SCRIPT_URL = 'mock-script-url-for-injected.js';
global.chrome = {
  runtime: {
    getURL: jest.fn().mockReturnValue(MOCK_SCRIPT_URL),
  },
} as any;

describe('InjectorHandler', () => {
  let element: HTMLElement;
  let mockContentEventsBinder: MockContentEventsBinder;
  let injectorHandler: InjectorHandler;
  let superSetValueSpy: jest.SpyInstance;
  let postMessageSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    element = createElementInDocument();
    mockContentEventsBinder = new MockContentEventsBinder();

    injectorHandler = new InjectorHandler(
      element,
      mockContentEventsBinder,
      'textarea',
    );

    (injectorHandler as any).injectScript = jest
      .fn()
      .mockImplementation((onload) => {
        if (onload) onload();
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('constructor should initialize properties correctly', () => {
    expect(injectorHandler).toBeDefined();
    expect(injectorHandler['uuid']).toBe('1234-uuid');
  });

  test('load should inject script and handle "ready" event', async () => {
    const loadPromise = injectorHandler.load();

    const messageEvent = new MessageEvent('message', {
      data: { uuid: '1234-uuid', type: 'ready', payload: {} },
      source: window,
    });

    window.dispatchEvent(messageEvent);

    await expect(loadPromise).resolves.toEqual({});
  }, 10000);

  test('setValue should post message to injected script', () => {
    postMessageSpy = jest.spyOn(window, 'postMessage');
    const value = 'testValue';
    injectorHandler.setValue(value, { text: value });
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { text: 'testValue' },
        type: 'setValue',
        uuid: '1234-uuid',
      }),
      window.location.origin,
    );
  });

  test('setValue should call super.setValue', () => {
    superSetValueSpy = jest
      .spyOn(InjectorHandler.prototype, 'setValue')
      .mockImplementation(() => {});
    const value = 'testValue';
    injectorHandler.setValue(value, { text: value });
    expect(superSetValueSpy).toHaveBeenCalled();
    superSetValueSpy.mockRestore();
  });

  test('setValue should post message to injected script and call super.setValue', () => {
    superSetValueSpy = jest
      .spyOn(BaseHandler.prototype, 'setValue')
      .mockImplementation(() => {});
    postMessageSpy = jest.spyOn(window, 'postMessage');
    const value = 'testValue';
    injectorHandler.setValue(value, { text: value });
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { text: 'testValue' },
        type: 'setValue',
        uuid: '1234-uuid',
      }),
      window.location.origin,
    );
    expect(superSetValueSpy).toHaveBeenCalled();
    superSetValueSpy.mockRestore();
  });

  test('getValue should post "getValue" message and resolve with value', async () => {
    const promise = injectorHandler.getValue();
    injectorHandler.emit('value', { text: 'testValue' });
    await expect(promise).resolves.toEqual({ text: 'testValue' });
  });
});
