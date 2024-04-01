import type { UpdateTextPayload, Selection } from '@/handlers/types';
import { isNumber } from '@/util/guard';
import { KeyboardMapper, NonModifierKey } from '@/util/keyboard-mapper';
import { debounce } from '@/util/debounce';
import MonacoBase from '@/handlers/injected/monaco-base';

/**
 * Handles interaction with Monaco-like editors where the Monaco editor's API is not directly
 * exposed. This class simulates user actions like typing and navigation through keyboard event
 * simulation and direct DOM manipulation to provide integration capabilities with such editors.
 */
class InjectedMonacoSimulatorHandler extends MonacoBase {
  value: string;
  linesContainer: HTMLElement;
  editorContainer: HTMLDivElement;
  /**
   * Constructs a handler for interacting with Monaco-like editors without direct API access.
   * @param elem The element that represents the textual input area of the editor.
   * @param uuid A unique identifier for this handler instance.
   */

  constructor(elem: HTMLTextAreaElement, uuid: string) {
    super(elem, uuid);
    this.silenced = false;
  }

  /**
   * Asynchronously performs the initial setup of the handler, including finding and storing references
   * to necessary DOM elements like the editor container and the lines container.
   */

  async load() {
    return new Promise<void>((resolve) => {
      try {
        this.focus();
        this.select();
        this.editorContainer = this.getVisualElement() as HTMLDivElement;

        const container =
          this.editorContainer.querySelector<HTMLElement>('.lines-content');

        if (!container) {
          throw new Error('Monaco editor is not available.');
        }

        this.linesContainer = container as HTMLElement;
      } catch (error) {
        throw new Error('Monaco editor is not available.');
      } finally {
        return resolve();
      }
    });
  }

  /**
   * Simulates pressing a key within the editor, optionally with delay and additional keyboard event data.
   * @param key The key to simulate pressing.
   * @param evData Additional data for the keyboard event simulation.
   * @param options Options for the simulation, including delay.
   * @param element The target element for the keyboard event, defaults to the active element or document body.
   */
  async press(
    key: NonModifierKey,
    evData?: KeyboardEventInit,
    options = { delay: 0 },
    element: Element | null = null,
  ): Promise<void> {
    if (!element) {
      element = document.activeElement || document.body;
    }

    const props = KeyboardMapper.getKeyConfig(key);

    const eventData = {
      bubbles: true,
      cancelable: false,
      view: window,
      ...props,
      ...evData,
    };

    element.dispatchEvent(new KeyboardEvent('keydown', eventData));
    element.dispatchEvent(new KeyboardEvent('keypress', eventData));

    if (options.delay) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }

    element.dispatchEvent(new KeyboardEvent('keyup', eventData));
  }

  private gotoPos = debounce(async (options: UpdateTextPayload) => {
    this.focus();

    await this.setPosition(options);
  }, 0);

  /**
   * Updates the value within the editor, potentially navigating to a specified position.
   * @param value The new value to set within the editor.
   * @param options Optional parameters including line and column for cursor positioning.
   */
  setValue = debounce((value: string, options?: UpdateTextPayload) => {
    if (!this.value || value !== this.value) {
      this.value = value;

      this.press('a', { ctrlKey: true });
      if (this.value === '') {
        this.press('Delete');
      } else {
        this.paste(this.value);
      }

      this.blur();
      if (options) {
        this.gotoPos(options);
      }
    } else {
      this.setSelecton(value, options);
    }
  }, 0);

  /**
   * Retrieves the current textual value represented within the editor.
   * @returns The text content of the editor.
   */
  async getValue() {
    const value = await this.getAllSortedLinesContent();

    this.value = value;
    try {
      await this.ensureFirstPage();
    } catch (_) {}

    return value;
  }

  async setPosition(
    options?: Pick<UpdateTextPayload, 'lineNumber' | 'column'>,
  ) {
    await this.press('Home', { ctrlKey: true });
    const lineNumber = options?.lineNumber;
    const column = options?.column;

    this.forwardLine(lineNumber);
    this.forwardColumn(column);
  }

  private forwardLine(lineNumber?: number, evData?: KeyboardEventInit) {
    if (isNumber(lineNumber)) {
      for (let i = 1; i < lineNumber; i++) {
        this.press('ArrowDown', evData);
      }
    }
  }

  private forwardColumn(column?: number, evData?: KeyboardEventInit) {
    if (isNumber(column)) {
      for (let i = 1; i < column; i++) {
        this.press('ArrowRight', evData);
      }
    }
  }

  private getTopStyleProperty() {
    const top = this.linesContainer.style?.top;

    if (top) {
      return parseFloat(top);
    }
    return null;
  }

  private isOnFirstPage() {
    return this.getTopStyleProperty() === 0;
  }

  private async ensureFirstPage() {
    if (!this.isOnFirstPage()) {
      this.press('Home', { ctrlKey: true });
      await this.waitForStyleChange(this.linesContainer);
    }
  }

  /**
   * Gathers all visible lines' content from the editor, sorts them by their position, and returns the combined text.
   * This method ensures that the editor is scrolled to the top before starting to collect the lines, simulating a user's
   * action of scrolling through the editor to read all content. It handles pagination by simulating page down key presses
   * until no new lines are detected, ensuring a complete capture of the editor's content.
   * @returns A string representing the combined text of all sorted lines within the editor.
   */
  private async getAllSortedLinesContent() {
    try {
      if (!this.isOnFirstPage()) {
        this.press('Home', { ctrlKey: true });
        await this.waitForStyleChange(this.linesContainer);
      } else {
        this.press('Home', { ctrlKey: true });
        await this.waitForStyleChange(this.elem, 1000);
      }
    } catch (_) {}

    const linesElements = new Set<HTMLElement>();

    try {
      do {
        const lines = this.getVisualElement()?.querySelectorAll<HTMLElement>(
          '.view-lines .view-line',
        );
        lines?.forEach((line) => {
          linesElements.add(line);
        });
        this.press('PageDown');
        this.press('PageDown');
        this.focus();
      } while (await this.waitForStyleChange(this.linesContainer, 1000));
    } catch (err) {}

    const lineElementsSorted = Array.from(linesElements).sort(
      (a, b) => parseFloat(a.style?.top) - parseFloat(b.style?.top),
    );

    const strs = lineElementsSorted.map((el) =>
      (el.textContent || '').replace(/\u00A0/g, ' '),
    );

    return strs.join('\n');
  }

  /**
   * Waits for a style change on a specified element, resolving if a change is detected or rejecting after a timeout.
   * @param targetElement The element to observe for style changes.
   * @param timeout The maximum time to wait for a change before rejecting, in milliseconds.
   * @returns A promise that resolves to true if a style change is detected, or rejects with an error on timeout.
   */
  private async waitForStyleChange(
    targetElement: Node,
    timeout = 3000,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver((mutations, obs) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'style') {
            obs.disconnect();
            resolve(true);
          }
        });
      });

      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(new Error('Timeout waiting for style changes'));
      }, timeout);

      observer.observe(targetElement, {
        attributes: true,
        attributeFilter: ['style'],
      });

      return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
      };
    });
  }

  /**
   * Selects text within the editor based on provided start and end positions, simulating a user's text selection action.
   * @param str The string in which to calculate selection positions.
   * @param selections An array of selection objects representing the start and end positions.
   */

  async setSelecton(str: string, options?: UpdateTextPayload) {
    const lineNumber = options?.lineNumber;
    const column = options?.column;
    const selections = options?.selections;
    const selection = selections && selections[0];

    const data =
      selection &&
      selection.start !== selection.end &&
      this.calcSelection(str, selection);

    if (!data) {
      this.focus();
      this.setPosition(options);
      return;
    }

    if (!lineNumber || !column) {
      return;
    }

    const {
      selectionStartColumn,
      selectionStartLine,
      selectionEndLine,
      selectionEndColumn,
    } = data;

    this.focus();
    await this.press('Home', { ctrlKey: true });

    if (
      lineNumber === selectionEndLine &&
      lineNumber === selectionStartLine &&
      selectionStartColumn === column
    ) {
      this.forwardLine(selectionStartLine);
      this.forwardColumn(selectionEndColumn);
      const cols = selectionEndColumn - selectionStartColumn;

      for (let i = 0; i < cols; i++) {
        this.press('ArrowLeft', { shiftKey: true });
      }
    } else if (lineNumber >= selectionEndLine) {
      this.forwardLine(selectionStartLine);
      this.forwardColumn(selectionStartColumn);

      const nextLine = selectionEndLine - selectionStartLine;
      if (nextLine > 0) {
        this.forwardLine(nextLine + 1, {
          shiftKey: true,
        });
        this.forwardColumn(selectionEndColumn, { shiftKey: true });
      } else {
        const cols = selectionEndColumn - selectionStartColumn;
        this.forwardColumn(cols + 1, {
          shiftKey: true,
        });
      }
    } else {
      this.forwardLine(selectionEndLine);
      this.forwardColumn(selectionEndColumn);
      const nextLine = selectionEndLine - selectionStartLine;

      if (nextLine > 0) {
        for (let i = 1; i < nextLine + 1; i++) {
          this.press('ArrowUp', { shiftKey: true });
        }
        for (let i = 1; i < selectionEndColumn; i++) {
          this.press('ArrowLeft', { shiftKey: true });
        }
        this.forwardColumn(selectionStartColumn, { shiftKey: true });
      } else {
        const cols = selectionEndColumn - selectionStartColumn;

        for (let i = 0; i < cols; i++) {
          this.press('ArrowLeft', { shiftKey: true });
        }
      }
    }
  }

  private calcSelection(inputStr: string, selection: Selection) {
    let currentLine = 1;
    let currentColumn = 1;
    let selectionStartLine = null;
    let selectionStartColumn = null;

    let selectionEndLine = null;
    let selectionEndColumn = null;

    for (let i = 0, len = inputStr.length; i < len; i++) {
      const char = inputStr[i];

      if (i === selection.start) {
        selectionStartLine = currentLine;
        selectionStartColumn = currentColumn;
      }

      if (i === selection.end) {
        selectionEndLine = currentLine;
        selectionEndColumn = currentColumn;
      }

      if (
        selectionStartColumn &&
        selectionStartLine &&
        selectionEndLine &&
        selectionEndColumn
      ) {
        return {
          selectionStartColumn,
          selectionStartLine,
          selectionEndLine,
          selectionEndColumn,
        };
      }

      if (char === '\n') {
        currentLine++;
        currentColumn = 1;
      } else {
        currentColumn++;
      }
    }

    if (selectionStartColumn && selectionStartLine) {
      return {
        selectionStartColumn,
        selectionStartLine,
        selectionEndLine: selectionEndLine || currentLine,
        selectionEndColumn: selectionEndColumn || currentColumn,
      };
    }
  }

  /**
   * Currently not supported
   */
  bindChange() {}

  /**
   * Simulates pasting a provided value into the editor, utilizing the ClipboardEvent interface.
   * @param v The value to paste into the editor.
   */

  private paste(v: string) {
    const event = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: false,
      clipboardData: new DataTransfer(),
    });
    event?.clipboardData?.setData('text/plain', v);

    this.elem.dispatchEvent(event);
  }

  /**
   * Sets the focus to the editor's input element, initiating the text editing session.
   */
  private focus() {
    this.elem.dispatchEvent(
      new FocusEvent('focus', {
        bubbles: false,
        cancelable: false,
        composed: true,
        view: window,
        detail: 0,
        which: 0,
      }),
    );
  }
  /**
   * Removes focus from the editor's input element, effectively ending the text editing session.
   */
  private blur() {
    this.elem.dispatchEvent(
      new FocusEvent('blur', { cancelable: false, bubbles: true }),
    );
  }

  /**
   * Selects the text within the editor.
   */

  private select() {
    this.elem.dispatchEvent(
      new Event('select', {
        bubbles: true,
        cancelable: false,
        composed: false,
      }),
    );
  }
}

export default InjectedMonacoSimulatorHandler;
