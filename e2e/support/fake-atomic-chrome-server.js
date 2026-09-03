const { EventEmitter } = require('events');
const { WebSocket, WebSocketServer } = require('ws');

class FakeAtomicChromeServer extends EventEmitter {
  constructor({ port = 64292 } = {}) {
    super();
    this.port = port;
    this.messages = [];
    this.server = undefined;
  }

  async listen() {
    this.server = new WebSocketServer({
      host: '127.0.0.1',
      port: this.port,
    });

    this.server.on('connection', (client) => {
      client.on('message', (data) => {
        const text = data.toString();
        let message;
        try {
          message = JSON.parse(text);
        } catch (error) {
          message = text;
        }

        const event = { client, message };
        this.messages.push(event);
        this.emit('message', event);
      });
    });

    await new Promise((resolve, reject) => {
      const onError = (error) => {
        this.server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        this.server.off('error', onError);
        resolve();
      };

      this.server.once('error', onError);
      this.server.once('listening', onListening);
    });
  }

  send(client, message) {
    if (client.readyState !== WebSocket.OPEN) {
      throw new Error('Cannot send to a closed fake Atomic Chrome client');
    }
    client.send(JSON.stringify(message));
  }

  waitForMessage(predicate, timeoutMs = 5000) {
    const existing = this.messages.find(({ message }) => predicate(message));
    if (existing) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('message', onMessage);
        reject(new Error('Timed out waiting for WebSocket message'));
      }, timeoutMs);

      const onMessage = (event) => {
        if (!predicate(event.message)) {
          return;
        }

        clearTimeout(timer);
        this.off('message', onMessage);
        resolve(event);
      };

      this.on('message', onMessage);
    });
  }

  reset() {
    this.messages = [];
  }

  async close() {
    if (!this.server) {
      return;
    }

    for (const client of this.server.clients) {
      client.terminate();
    }

    await new Promise((resolve) => {
      this.server.close(resolve);
    });
    this.server = undefined;
  }
}

module.exports = {
  FakeAtomicChromeServer,
};
