/**
 * Interface for handlers that are injected into a context, such as a webpage.
 */
export interface IInjectedHandler {
  /**
   * Sets up the handler, performing any necessary initialization.
   * @returns A promise that resolves once setup is complete.
   */
  setup(): Promise<void>;
  /**
   * Triggered post setup to signal readiness.
   */
  postReady(): void;
  /**
   * Handles incoming messages.
   * @param data - The data of the message including type, uuid, and payload.
   */
  handleMessage(data: { type: string; uuid: string; payload: unknown }): void;
}
