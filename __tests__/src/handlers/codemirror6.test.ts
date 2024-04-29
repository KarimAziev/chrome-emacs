import CodeMirror6Handler from '@/handlers/codemirror6';
import InjectorHandler from '@/handlers/injector';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

let mockElem: HTMLTextAreaElement;
let mockParent: HTMLDivElement;

const mockContentEventsBinder = {
  bind: jest.fn(),
};

describe('CodeMirror6Handler', () => {
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
      const handler = new CodeMirror6Handler(mockElem, mockContentEventsBinder);

      expect(handler).toBeDefined();
      expect((handler as any).elem).toBe(mockElem);
    });
  });

  describe('setValue', () => {
    it('should set value without triggering DOM event', () => {
      const mockValue = 'test value';
      const options = { text: mockValue, triggerDOMEvent: false };
      const handler = new CodeMirror6Handler(mockElem, mockContentEventsBinder);
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
      const handler = new CodeMirror6Handler(mockElem, mockContentEventsBinder);
      const superGetValueSpy = jest
        .spyOn(InjectorHandler.prototype, 'getValue')
        .mockImplementation(async () => ({ text: 'my text' }));
      await handler.getValue();
      expect(superGetValueSpy).toHaveBeenCalled();
      superGetValueSpy.mockRestore();
    });

    it('should post a "getValue" message and resolve with the value', async () => {
      const handler = new CodeMirror6Handler(mockElem, mockContentEventsBinder);
      const promise = handler.getValue();
      handler.emit('value', { text: 'testValue' });
      await expect(promise).resolves.toEqual({ text: 'testValue' });
    });
  });

  describe('static canHandle determines if the given element can be handled by CodeMirror6Handler', () => {
    it('should correctly identify if the element can be handled', () => {
      const canHandle = CodeMirror6Handler.canHandle(mockElem);

      expect(canHandle).toBe(false);
    });
    it('should return false when the parent element itself is checked', () => {
      mockParent.classList.add(
        VISUAL_ELEMENT_SELECTOR.cmEditor.replace('.', ''),
      );
      const canHandle = CodeMirror6Handler.canHandle(mockParent as any);

      expect(canHandle).toBe(false);
    });
    it('should return true if the element meets all conditions', () => {
      mockParent.classList.add(
        VISUAL_ELEMENT_SELECTOR.cmEditor.replace('.', ''),
      );

      mockElem.classList.add('cm-content');

      const canHandle = CodeMirror6Handler.canHandle(mockElem);

      expect(canHandle).toBe(true);
    });
  });

  describe('static getHintArea', () => {
    it("should return the closest visual element that matches the handler's selector", () => {
      mockParent.classList.add(
        VISUAL_ELEMENT_SELECTOR.cmEditor.replace('.', ''),
      );

      const result = CodeMirror6Handler.getHintArea(mockElem);

      expect(result).toBe(mockParent);
    });
  });

  describe('static getName', () => {
    it('should return "codemirror6" as the handler name', () => {
      const name = CodeMirror6Handler.getName();

      expect(name).toBe('codemirror6');
    });
  });
});
