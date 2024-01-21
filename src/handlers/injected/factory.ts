export type HandlerClass = new (...args: any[]) => any;

class InjectedHandlerFactory {
  private handlers: Record<string, HandlerClass>;

  constructor() {
    this.handlers = {};
  }

  registerHandler(name: string, klass: HandlerClass): void {
    this.handlers[name] = klass;
  }

  getHandler(name: string): HandlerClass | undefined {
    return this.handlers[name];
  }
}

export default new InjectedHandlerFactory();
