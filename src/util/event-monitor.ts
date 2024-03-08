import { log } from '@/util/log';

type EventListenerRecord = {
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
};

/**
 * Class responsible for monitoring and managing event listeners on a specified DOM element.
 * This is particularly useful for extending or integrating complex third-party UI components
 * like the Monaco Editor, where precise control over event listeners is necessary to ensure
 * extensions or modifications do not interfere with the component's native behavior.
 */

export class ElementEventMonitor {
  private originalAddEventListener: typeof Element.prototype.addEventListener;
  private originalRemoveEventListener: typeof Element.prototype.removeEventListener;
  private element: Element;
  private listeners: EventListenerRecord[] = [];

  private formatElement() {
    const selectorsPrefixes: { [key: string]: (v: string) => string } = {
      id: (value: string) => `#${value}`,
      class: (value: string) => `.${value.split(' ').join('.')}`,
      href: (val: string) => `[href="${val}"]`,
      name: (val: string) => `[name="${val}"]`,
    };

    const tagName = this.element.tagName;
    if (tagName) {
      const selector = Object.keys(selectorsPrefixes).reduce((acc, key) => {
        const value = this.element?.getAttribute(key);
        const func = selectorsPrefixes[key];
        if (value) {
          const normalizedValue = func(value);
          acc += normalizedValue;
        }
        return acc;
      }, tagName.toLowerCase());

      return selector;
    }
  }

  private execIfDebug(fn: (...args: any[]) => any) {
    if (process.env.DEBUG) {
      fn();
    }
  }

  /**
   * Constructs an instance of ElementEventMonitor.
   * @param element The DOM Element to monitor. Event listeners added to this element will be tracked.
   */
  constructor(element: Element) {
    this.element = element;
    // Save the original `addEventListener` and `removeEventListener` to restore later.
    this.originalAddEventListener = element.addEventListener.bind(element);
    this.originalRemoveEventListener =
      element.removeEventListener.bind(element);
  }

  /**
   * Starts monitoring the element by overriding its addEventListener and removeEventListener methods.
   * This allows tracking of event listeners added or removed after this method is invoked.
   * Original functionalities of added event listeners are preserved and executed as intended.
   */
  start(): void {
    this.element.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): void => {
      this.execIfDebug(() =>
        log(
          `Added '${type}' listener from element '${this.formatElement()}'`,
          listener,
          'options',
          options,
        ),
      );
      this.listeners.push({ type, listener, options });
      // Call the original `addEventListener` method.
      this.originalAddEventListener(type, listener, options);
    };

    this.element.removeEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ): void => {
      this.execIfDebug(() =>
        log(
          `Removed '${type}' listener from element '${this.formatElement()}'`,
          listener,
          'options',
          options,
        ),
      );

      // Find and remove the listener from the array.
      this.listeners = this.listeners.filter(
        (l) => l.type !== type || l.listener !== listener,
      );
      // Call the original `removeEventListener` method.
      this.originalRemoveEventListener(type, listener, options);
    };
  }
  /**
   * Cleans up by removing all monitored event listeners and restoring original addEventListener
   * and removeEventListener methods to the element. This method ensures that no residual effects
   * remain on the element after the monitor is no longer needed.
   */
  cleanup(): void {
    // Remove all listeners that were added.
    this.listeners.forEach(({ type, listener, options }) => {
      this.originalRemoveEventListener(type, listener, options);
      this.execIfDebug(() => {
        log(
          `Cleanup: '${type}' listener from element '${this.formatElement()}'`,
          'listener:',
          listener,
          'options:',
          options,
        );
      });
    });
    this.listeners = [];
    // Restore the original methods on the element.
    this.element.addEventListener = this.originalAddEventListener;
    this.element.removeEventListener = this.originalRemoveEventListener;
  }
}
