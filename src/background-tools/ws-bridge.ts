import { ClosedMessagePayload } from '@/handlers/types';

export const WS_PORT: number = 64292;
export const WS_URL: string = `ws://localhost:${WS_PORT}`;

/**
 * Represents a bridge for WebSocket communication.
 */
class WSBridge {
  private webSocket: WebSocket | null = null;
  private keepAliveIntervalId: number | null = null;

  /**
   * Opens a WebSocket connection and sets up message handlers.
   * @param port The Chrome Extension's port for communication.
   */
  openConnection(port: chrome.runtime.Port): void {
    const queue: string[] = [];
    const ws: WebSocket = this.makeWS(port, queue);
    port.onMessage.addListener((msg: any) => this.sendMessage(ws, queue, msg));
    port.onDisconnect.addListener(() => ws.close());
  }

  /**
   * Creates and initializes a WebSocket connection.
   * @param port The Chrome Extension's port for communication.
   * @param queue A queue for messages that are sent before the connection is established.
   * @returns The initialized WebSocket object.
   */
  private makeWS(port: chrome.runtime.Port, queue: string[]): WebSocket {
    const ws = new WebSocket(WS_URL);
    this.webSocket = ws;

    ws.onopen = () => {
      this.startKeepAlive();
      while (queue.length > 0) {
        ws.send(queue.shift() as string);
      }
    };

    ws.onmessage = (wsMsg: MessageEvent) => {
      port.postMessage(JSON.parse(wsMsg.data));
    };

    ws.onclose = (evt: CloseEvent) => {
      const payload: ClosedMessagePayload = {
        code: evt.code,
        reason: evt.reason,
        wasClean: evt.wasClean,
      };

      this.stopKeepAlive();
      port.postMessage({
        type: 'closed',
        payload,
      });
      port.disconnect();
      this.webSocket = null;
    };

    return ws;
  }

  /**
   * Starts the keep-alive procedure by sending a heartbeat every 20 seconds.
   */
  private startKeepAlive(): void {
    if (this.keepAliveIntervalId) {
      clearInterval(this.keepAliveIntervalId);
    }
    this.keepAliveIntervalId = setInterval(() => {
      if (this.webSocket) {
        this.webSocket.send(JSON.stringify({ type: 'keepalive' }));
      } else {
        this.stopKeepAlive();
      }
    }, 20 * 1000); // 20 seconds
  }

  /**
   * Stops the keep-alive procedure.
   */
  private stopKeepAlive(): void {
    if (this.keepAliveIntervalId) {
      clearInterval(this.keepAliveIntervalId);
      this.keepAliveIntervalId = null;
    }
  }

  /**
   * Sends a message through the WebSocket or queues it if the connection is being established.
   * @param ws The WebSocket through which the message should be sent.
   * @param queue The queue where messages are stored before the WebSocket is open.
   * @param msg The message to be sent or queued.
   */
  private sendMessage(ws: WebSocket, queue: string[], msg: any): void {
    const message = JSON.stringify(msg);
    if (ws.readyState === WebSocket.CONNECTING) {
      queue.push(message);
    } else if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }

  /**
   * Closes the WebSocket connection if it exists and stops the keep-alive messages.
   */
  disconnect(): void {
    if (this.webSocket === null) {
      return;
    }
    this.webSocket.close();
    this.stopKeepAlive();
    this.webSocket = null;
  }
}

export default new WSBridge();
