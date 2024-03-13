import {
  LoadedOptions,
  UpdateTextPayload,
  PostToInjectorPayloadMap,
  BaseInjectedPostType,
} from '@/handlers/types';

/**
 * A base class for creating handlers that are injected into web pages.
 * These handlers communicate with the main application via postMessage.
 */
export default class BaseInjectedHandler<Elem extends Element> {
  elem: Elem;
  uuid: string;
  silenced: boolean = false;

  constructor(elem: Elem, uuid: string) {
    this.elem = elem;
    this.uuid = uuid;
  }
  /**
   * Sets up the handler, loading necessary resources and binding change events.
   */
  async setup(): Promise<void> {
    await this.load();
    this.bindChange(() => this.postToInjector('change'));
  }

  /**
   * Loads resources or performs initialization tasks. Designed to be overridden.
   */
  async load(): Promise<void> {}
  /**
   * Handles messages from the injector.
   *
   * @param data - The message data containing the type, uuid, and payload.
   */
  handleMessage(data: { type: string; uuid: string; payload: unknown }): void {
    if (data && data.type) {
      const methodName = `on${
        data.type.charAt(0).toUpperCase() + data.type.slice(1)
      }` as keyof this;

      if (
        data.uuid === this.uuid &&
        typeof (this as any)[methodName] === 'function'
      ) {
        (this as any)[methodName](data.payload);
      }
    }
  }
  /**
   * Handles 'getValue' messages by posting the current value to the injector.
   */
  onGetValue(): void {
    const position = this.getPosition();

    this.postToInjector('value', {
      text: this.getValue(),
      ...position,
    });
  }

  /**
   * Handles 'setValue' messages by setting the provided value.
   *
   * @param payload - The payload containing the text value to be set.
   */
  onSetValue(payload: UpdateTextPayload): void {
    this.setValue(payload.text, payload);
  }

  /**
   * Retrieves the value from the element. Must be implemented by subclasses.
   */
  getValue(): string {
    throw new Error('not implemented');
  }

  /**
   * Sets the value on the element. Must be implemented by subclasses.
   *
   * @param _value - The value to be set.
   */
  setValue(_value: string, _options?: UpdateTextPayload): void {
    throw new Error('not implemented');
  }
  /**
   * Binds a change event handler to the element. Must be implemented by subclasses.
   *
   * @param _handler - The handler to be executed on element changes.
   */
  bindChange(_handler: () => void): void {
    throw new Error('not implemented');
  }

  /**
   * Temporarily silences notifications to the injector within the provided function.
   *
   * @param f - The function to be executed silently.
   */
  executeSilenced(f: () => void): void {
    this.silenced = true;
    f();
    this.silenced = false;
  }

  /**
   * Posts a 'ready' message to the injector, optionally including extension data.
   */
  postReady(): void {
    const extension = this.getExtension();
    const parentEl = this.getVisualElement();
    const rect = parentEl?.getBoundingClientRect();
    const screenY = window.screenY;

    const position = this.getPosition();
    const payload = {
      ...position,
      extension,
      rect,
    };

    if (payload?.rect) {
      payload.rect.y = (rect?.y || 0) + screenY;
      payload.rect.x = (rect?.x || 0) + window.screenX;
    }

    this.postToInjector('ready', payload);
  }

  getPosition(): Pick<UpdateTextPayload, 'lineNumber' | 'column'> {
    return {
      lineNumber: 1,
      column: 1,
    };
  }

  /**
   * Optionally returns data about the handler's capabilities. Designed to be overridden.
   */
  getExtension(): LoadedOptions['extension'] {
    return undefined;
  }

  /**
   * Wraps a function with a check that only allows execution if the handler is not silenced.
   *
   * @param f - The function to wrap.
   * @returns A wrapped function that checks for silence before execution.
   */
  wrapSilence(f: (...args: unknown[]) => void): (...args: unknown[]) => void {
    return (...args) => {
      if (!this.silenced) {
        f(...args);
      }
    };
  }

  onUnload(): void {}

  /**
   * Posts a message to the injector.
   *
   * @param type - The type of the message.
   * @param payload - The message payload.
   */
  postToInjector<T extends BaseInjectedPostType>(
    type: T,
    payload?: PostToInjectorPayloadMap[T],
  ): void {
    const message = {
      type: type,
      uuid: this.uuid,
      payload: payload || {},
    };

    window.postMessage(message, location.origin);
  }

  getVisualElement(): Element | Elem | HTMLElement | null | undefined {
    return this.elem.parentElement;
  }
}
