import BaseHandler from '@/handlers/base';
import type { IContentEventsBinder } from '@/handlers/types';

class MockContentEventsBinder implements IContentEventsBinder {
  bind = jest.fn();
}

const createElementInDocument = (): HTMLElement => {
  document.body.innerHTML = `<div></div>`;
  return document.body.firstChild as HTMLElement;
};

describe('BaseHandler', () => {
  let mockContentEventsBinder: MockContentEventsBinder;
  let baseHandler: BaseHandler;
  let element: HTMLElement;
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    element = createElementInDocument();

    addEventListenerSpy = jest.spyOn(element, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(element, 'removeEventListener');

    mockContentEventsBinder = new MockContentEventsBinder();
    baseHandler = new BaseHandler(element, mockContentEventsBinder);
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  test('constructor should bind content events to the window and handler', () => {
    expect(mockContentEventsBinder.bind).toHaveBeenCalledWith(
      baseHandler,
      window,
    );
  });

  test('load should resolve with empty object', async () => {
    await expect(baseHandler.load()).resolves.toEqual({});
  });

  test('setValue should emit "valueSet" with the correct parameters', () => {
    const emitSpy = jest.spyOn(baseHandler, 'emit');
    const testValue = 'test value';
    const testOptions = { triggerDOMEvent: true, text: testValue };
    baseHandler.setValue(testValue, testOptions);
    expect(emitSpy).toHaveBeenCalledWith('valueSet', testValue, testOptions);
  });

  test('getValue should reject as the method is not implemented', async () => {
    await expect(baseHandler.getValue()).rejects.toEqual(
      'Method not implemented.',
    );
  });

  test('bindChange adds event listeners for "keyup" and "change" events', () => {
    const testFn = jest.fn();
    baseHandler.bindChange(testFn);
    expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', testFn, false);
    expect(addEventListenerSpy).toHaveBeenCalledWith('change', testFn, false);
  });

  test('unbindChange removes event listeners for "keyup" and "change" events', () => {
    const testFn = jest.fn();
    baseHandler.unbindChange(testFn);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', testFn, false);
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'change',
      testFn,
      false,
    );
  });
});
