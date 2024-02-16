import { IInjectedHandler } from './types';

export type HandlerConstructor = new (
  elem: HTMLElement,
  uuid: string,
) => IInjectedHandler;

class InjectedHandlerFactory {
  private handlers: Record<string, HandlerConstructor> = {};

  registerHandler(name: string, klass: HandlerConstructor): void {
    this.handlers[name] = klass;
  }

  getHandler(name: string): HandlerConstructor | undefined {
    return this.handlers[name];
  }
}

export default new InjectedHandlerFactory();
