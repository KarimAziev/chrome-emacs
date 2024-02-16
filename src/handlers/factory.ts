import { IHandlerConstructor } from './types';

class HandlerFactory {
  private handlers: IHandlerConstructor[] = [];

  registerHandler(handler: IHandlerConstructor): void {
    this.handlers.push(handler);
  }

  handlerFor(elem: Element): IHandlerConstructor | null {
    return this.handlers.find((handler) => handler.canHandle(elem)) || null;
  }
}

export default new HandlerFactory();
