export interface IInjectedHandler {
  setup(): Promise<void>;
  postReady(): void;
  handleMessage(data: { type: string; uuid: string; payload: unknown }): void;
}
