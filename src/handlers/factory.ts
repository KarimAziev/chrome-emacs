import { IHandlerConstructor } from '@/handlers/types';

/**
 * Factory class for managing and providing appropriate handlers for elements.
 */
class HandlerFactory<El extends Element> {
  private handlers: IHandlerConstructor<El>[] = [];

  /**
   * Registers a new handler constructor to the factory.
   * @param handler - The handler constructor to register.
   */
  registerHandler(handler: IHandlerConstructor): void {
    this.handlers.push(handler);
  }
  /**
   * Finds and returns the appropriate handler constructor for a given element.
   * @param elem - The element needing a handler.
   * @returns The handler constructor that can handle the element, or null if none found.
   */
  handlerFor(elem: El): IHandlerConstructor | null {
    return this.handlers.find((handler) => handler.canHandle(elem)) || null;
  }
}

export default new HandlerFactory();
