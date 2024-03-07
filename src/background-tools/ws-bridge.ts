import type { ClosedMessagePayload } from '@/handlers/types';

export const WS_PORT: number = 64292;
export const WS_URL: string = `ws://localhost:${WS_PORT}`;

// 10 seconds
const KEEP_ALIVE_INTERVAL = 10 * 1000;

/**
 * Represents a bridge for WebSocket communication.
 */
class WSBridge {
  private webSocket: WebSocket | null = null;
  private keepAliveIntervalId: NodeJS.Timeout | null = null;

  /**
   * Opens a WebSocket connection and sets up message handlers.
   * @param port The Chrome Extension's port for communication.
   */
  openConnection(port: chrome.runtime.Port): void {
    const queue: string[] = [];
    const ws: WebSocket = this.makeWS(port, queue);
    port.onMessage.addListener((msg: any) => this.sendMessage(ws, queue, msg));

    port.onDisconnect.addListener(() => {
      ws.close(1000);
    });
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
      chrome.action.setIcon({ path: '../images/icon-19.png' });
      this.startKeepAliveLoop();
      while (queue.length > 0) {
        ws.send(queue.shift() as string);
      }
    };

    ws.onmessage = (wsMsg: MessageEvent) => {
      this.startKeepAliveLoop();
      port.postMessage(JSON.parse(wsMsg.data));
    };

    ws.onclose = (evt: CloseEvent) => {
      this.stopKeepAlive();
      chrome.action.setIcon({ path: '../images/icon-19-inactive.png' });

      const payload: ClosedMessagePayload = {
        code: evt.code,
        reason: evt.reason,
        wasClean: evt.wasClean,
      };

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
   * Starts the keep-alive procedure to maintain the WebSocket connection.
   * This method ensures a keep-alive message is sent over the WebSocket connection
   * at regular intervals specified by KEEP_ALIVE_INTERVAL. If an existing keep-alive
   * timeout is present, it is cleared and reset to ensure only one keep-alive cycle
   * runs at any given time. If the WebSocket connection is active, a 'keepalive'
   * message is sent; if sending fails, the keep-alive procedure is stopped.
   */
  private startKeepAliveLoop(): void {
    if (this.keepAliveIntervalId) {
      clearTimeout(this.keepAliveIntervalId);
    }

    this.keepAliveIntervalId = setTimeout(() => {
      if (this.webSocket) {
        try {
          this.webSocket.send(JSON.stringify({ type: 'keepalive' }));
          this.startKeepAliveLoop();
        } catch (error) {
          console.error('Failed to send keepalive message:', error);
          this.stopKeepAlive();
        }
      }
    }, KEEP_ALIVE_INTERVAL);
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
      try {
        ws.send(message);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  }

  /**
   * Closes the WebSocket connection if it exists and stops the keep-alive messages.
   */
  disconnect(): void {
    this.stopKeepAlive();
    if (this.webSocket === null) {
      return;
    }
    this.webSocket.close();
    this.webSocket = null;
  }
}

export default new WSBridge();
