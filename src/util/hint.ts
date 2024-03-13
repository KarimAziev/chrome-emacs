type HintPair = [HTMLDivElement, HTMLTextAreaElement];

const HINT_ATTRIBUTE_NAME = 'data-chrome-emacs-hint';

class HintReader {
  private isReading: boolean = false;
  private hints: HintPair[] = [];
  private listener: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    const existingHints = document.querySelectorAll(`[${HINT_ATTRIBUTE_NAME}]`);
    this.isReading = existingHints.length > 0;
  }

  public getIsReading(): boolean {
    return (
      this.isReading ||
      document.querySelectorAll(`[${HINT_ATTRIBUTE_NAME}]`).length > 0
    );
  }

  private static isEscapeKey(event: KeyboardEvent): boolean {
    return (event.ctrlKey && event.key === 'g') || event.key === 'Escape';
  }

  private static genLabels(total: number): string[] {
    const characters = 'asdfgqwertzxcvb';
    let hints: string[] = [''];
    let counter = 0;

    while (counter < total) {
      const prefix = hints[counter++];
      if (!prefix) {
        hints = characters.split('').concat(hints);
        continue;
      }
      hints = hints.concat(characters.split('').map((char) => char + prefix));
    }

    return hints.slice(0, total).map((label) => label.toUpperCase());
  }

  private static makeHint(el: Element, text: string): HTMLDivElement {
    const hint = document.createElement('div');
    hint.setAttribute(HINT_ATTRIBUTE_NAME, 'hint'); // Set custom attribute
    hint.textContent = text;
    hint.style.cssText = `
  position: absolute;
  background: black;
  color: red;
  border: 2px solid red;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 1.5rem;
  z-index: 100000;
`;
    const rect = el.getBoundingClientRect();
    hint.style.top = `${window.scrollY + rect.top - hint.offsetHeight - 2}px`;
    hint.style.left = `${
      window.scrollX + rect.left + (rect.width - hint.offsetWidth) / 2
    }px`;
    document.body.appendChild(hint);

    return hint;
  }

  public readEditableContent(
    elements: HTMLTextAreaElement[],
  ): Promise<HTMLTextAreaElement> {
    return new Promise((resolve, reject) => {
      if (this.isReading) {
        return reject(new Error('Read operation is already in progress'));
      }
      this.isReading = true;

      this.listener = (event: KeyboardEvent) =>
        this.handleKeydown(resolve, reject, event);

      const hintChars = HintReader.genLabels(elements.length);

      elements.forEach((el, i) => {
        const hint = HintReader.makeHint(el, hintChars[i]);
        this.hints.push([hint, el]);
      });

      document.addEventListener('keydown', this.listener);
    });
  }

  private handleKeydown(
    resolve: (el: HTMLTextAreaElement) => void,
    reject: (reason?: any) => void,
    event: KeyboardEvent,
  ) {
    const key = event.key.toUpperCase();
    const isCancelled = HintReader.isEscapeKey(event);
    const [_hintItem, elem] =
      this.hints.find(([h, _el]) => h.textContent === key) || [];

    if (elem || isCancelled) {
      event.preventDefault();
      this.cancel();
      elem ? resolve(elem) : reject(new Error('Cancelled'));
    }
  }

  public cancel(): void {
    this.isReading = false;
    this.cleanup();
  }

  private cleanup(): void {
    this.hints.forEach(([hint, _]) => hint.remove());
    if (this.listener) {
      document.removeEventListener('keydown', this.listener);
      this.listener = null;
    }
    this.hints = [];
  }
}

export default new HintReader();
