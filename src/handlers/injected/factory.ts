import { IInjectedHandler } from '@/handlers/injected/types';

// Define an interface for classes with a static make method
interface IHandlerWithMake {
  make(elem: HTMLElement, uuid: string): Promise<IInjectedHandler>;
}

export type HandlerConstructor = {
  new (elem: HTMLElement, uuid: string): IInjectedHandler;
} & IHandlerWithMake;

class InjectedHandlerFactory {
  private handlers: Record<string, IHandlerWithMake> = {};

  registerHandler(name: string, klass: IHandlerWithMake): void {
    this.handlers[name] = klass;
  }

  getHandler(name: string): IHandlerWithMake | undefined {
    return this.handlers[name];
  }
}

export default new InjectedHandlerFactory();
