import {
  getCssSelector,
  isElementVisible,
  isContentEditableElement,
  isElementTag,
  addStyle,
  normalizeRect,
  setSelectionRange,
  estimateParent,
} from '@/util/dom';

describe('DOM utilities', () => {
  describe('getCssSelector', () => {
    it('should return unique CSS selector path with ID', () => {
      document.body.innerHTML = `<div id="uniqueId"><span class="class1">Test</span></div>`;
      const el = document.querySelector('.class1') as Element;
      expect(getCssSelector(el)).toBe('div#uniqueId > span');
    });

    it('should handle nth-of-type correctly', () => {
      document.body.innerHTML = `<div><span>Test1</span><span>Test2</span></div>`;
      const el = document.querySelector('div > span:nth-child(2)') as Element;
      expect(getCssSelector(el)).toBe(
        'html > body > div > span:nth-of-type(2)',
      );
    });
    it('should handle weird IDS correctly', () => {
      document.body.innerHTML = `<div id="e833c8b6-421c-4652-986e-dcbbe059b77a"><span>Test1</span><span>Test2</span></div>`;
      const el = document.querySelector('div > span:nth-child(2)') as Element;
      expect(getCssSelector(el)).toBe(
        'div#e833c8b6-421c-4652-986e-dcbbe059b77a > span:nth-of-type(2)',
      );
    });
  });

  describe('isElementVisible', () => {
    it('should detect if an element is within the viewport', () => {
      const elem = document.createElement('div');
      document.body.appendChild(elem);
      Object.defineProperty(elem, 'getBoundingClientRect', {
        value: () => ({
          top: 10,
          left: 10,
          bottom: 20,
          right: 20,
        }),
      });
      expect(isElementVisible(elem)).toBeTruthy();
    });
  });
  describe('isContentEditableElement', () => {
    it('should return true if the element is content editable', () => {
      const elem = document.createElement('div');
      elem.contentEditable = 'true';
      (elem as any).isContentEditable = true;

      expect(isContentEditableElement(elem)).toBeTruthy();
    });
  });

  describe('isElementTag', () => {
    it('should compare the tagName correctly', () => {
      const elem = document.createElement('a');
      expect(isElementTag('a', elem)).toBeTruthy();
    });
  });
  describe('addStyle', () => {
    it('should add style correctly', () => {
      const elem: HTMLElement = document.createElement('div');
      addStyle(elem, { color: 'red' });
      expect(elem.style.color).toBe('red');
    });
  });
  describe('normalizeRect', () => {
    it('should return a normalized rect object', () => {
      const rect = normalizeRect(new DOMRect(10.5, 20.5, 30.1, 40.9));
      expect(rect).toEqual({
        x: 10,
        y: 20,
        width: 30,
        height: 40,
        top: 20,
        right: 40,
        bottom: 61,
        left: 10,
      });
    });
  });
  describe('setSelectionRange', () => {
    it('should set selection range', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.value = 'Hello World';
      setSelectionRange(textarea, 0, 5);
      expect(
        textarea.value.substring(
          textarea.selectionStart,
          textarea.selectionEnd,
        ),
      ).toBe('Hello');
    });
  });
  describe('estimateParent', () => {
    it('should find the closest parent matching the criteria', () => {
      document.body.innerHTML = `
      <div><p contenteditable="true"><span></span></p></div>
    `;
      const elem = document.querySelector('p')!;
      const parent = estimateParent(elem);

      expect(parent).toBe(elem.parentElement);
    });
    it('should return the element itself if the parent contains several editable elements', () => {
      document.body.innerHTML = `
      <div><p contenteditable="true"><span></span></p><textarea>Roses are red</textarea></div>
    `;
      const elem = document.querySelector('p')!;

      const parent = estimateParent(elem);

      expect(parent).toBe(elem);
    });
  });
});
