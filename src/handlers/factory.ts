export type HandlerConstructor = {
  new (...args: any[]): any;
  canHandle: (elem: Element) => boolean;
  load?: () => Promise<any>;
  setValue?: (value: string) => {};
};

class HandlerFactory {
  public handlers: HandlerConstructor[];

  constructor() {
    this.handlers = [];
  }

  registerHandler(handler: HandlerConstructor) {
    this.handlers.push(handler);
  }

  handlerFor(elem: Element): HandlerConstructor | null {
    for (const Handler of this.handlers) {
      if (Handler.canHandle(elem)) {
        return Handler;
      }
    }
    return null;
  }
}

export default new HandlerFactory();
