import MonacoHandler from '@/handlers/monaco';
import InjectorHandler from '@/handlers/injector';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

let mockElem: HTMLTextAreaElement;
let mockParent: HTMLDivElement;

const mockContentEventsBinder = {
  bind: jest.fn(),
};

describe('MonacoHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElem = document.createElement('textarea');
    mockParent = document.createElement('div');
    mockParent.appendChild(mockElem);
    document.body.appendChild(mockParent);
  });

  afterAll(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    it('should correctly initialize with the given parameters', () => {
      const handler = new MonacoHandler(mockElem, mockContentEventsBinder);

      expect(handler).toBeDefined();
      expect(handler.elem).toBe(mockElem);
    });
  });

  describe('setValue', () => {
    it('should set value without triggering DOM event', () => {
      const mockValue = 'test value';
      const options = { text: mockValue, triggerDOMEvent: false };
      const handler = new MonacoHandler(mockElem, mockContentEventsBinder);
      handler.setValue = jest.fn();
      handler.setValue(mockValue, options);

      expect(handler.setValue).toHaveBeenCalledWith(mockValue, {
        ...options,
        triggerDOMEvent: false,
      });
    });
  });

  describe('getValue', () => {
    it('should call super.getValue', async () => {
      const handler = new MonacoHandler(mockElem, mockContentEventsBinder);
      const superGetValueSpy = jest
        .spyOn(InjectorHandler.prototype, 'getValue')
        .mockImplementation(async () => ({ text: 'my text' }));
      await handler.getValue();
      expect(superGetValueSpy).toHaveBeenCalled();
      superGetValueSpy.mockRestore();
    });

    it('should post a "getValue" message and resolve with the value', async () => {
      const handler = new MonacoHandler(mockElem, mockContentEventsBinder);
      const promise = handler.getValue();
      handler.emit('value', { text: 'testValue' });
      await expect(promise).resolves.toEqual({ text: 'testValue' });
    });
  });

  describe('static canHandle determines if the given element can be handled by MonacoHandler', () => {
    it('should correctly identify if the element can be handled', () => {
      const canHandle = MonacoHandler.canHandle(mockElem);

      expect(canHandle).toBe(false);
    });
    it('should return false when the parent element itself is checked', () => {
      mockParent.classList.add(VISUAL_ELEMENT_SELECTOR.monaco.replace('.', ''));
      const canHandle = MonacoHandler.canHandle(mockParent as any);

      expect(canHandle).toBe(false);
    });
    it('should return true if the element meets all conditions', () => {
      mockParent.classList.add(VISUAL_ELEMENT_SELECTOR.monaco.replace('.', ''));

      const canHandle = MonacoHandler.canHandle(mockElem);

      expect(canHandle).toBe(true);
    });

    it('returns false if the textarea is not wrapped in an element with the `monaco-editor` class', () => {
      mockParent.classList.remove(
        VISUAL_ELEMENT_SELECTOR.monaco.replace('.', ''),
      );
      const canHandle = MonacoHandler.canHandle(mockElem);

      expect(canHandle).toBe(false);
    });
  });

  describe('static getHintArea', () => {
    it('should return the closest visual element that matches the monaco selector', () => {
      mockParent.classList.add(VISUAL_ELEMENT_SELECTOR.monaco.replace('.', ''));

      const result = MonacoHandler.getHintArea(mockElem);

      expect(result).toBe(mockParent);
    });
  });

  describe('static getName', () => {
    it('should return "monaco" as the handler name', () => {
      const name = MonacoHandler.getName();

      expect(name).toBe('monaco');
    });
  });
});
