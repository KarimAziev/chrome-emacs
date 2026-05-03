type Listener<T extends (...args: any[]) => void> = T | null;

const makePort = () => {
  let messageListener: Listener<(msg: any) => void> = null;
  let disconnectListener: Listener<() => void> = null;

  return {
    sender: {
      tab: {
        id: 42,
      },
    },
    onMessage: {
      addListener: jest.fn((listener: (msg: any) => void) => {
        messageListener = listener;
      }),
    },
    onDisconnect: {
      addListener: jest.fn((listener: () => void) => {
        disconnectListener = listener;
      }),
    },
    postMessage: jest.fn(),
    disconnect: jest.fn(),
    emitMessage(msg: any) {
      messageListener?.(msg);
    },
    emitDisconnect() {
      disconnectListener?.();
    },
  };
};

describe('WSBridge', () => {
  let FakeWebSocket: any;
  let wsBridge: typeof import('@/background-tools/ws-bridge').default;

  const loadBridge = async () => {
    wsBridge = (await import('@/background-tools/ws-bridge')).default;
    return wsBridge;
  };

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    (global as any).chrome = {
      action: {
        setIcon: jest.fn(),
      },
    };

    FakeWebSocket = class {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      static instances: any[] = [];

      readyState = FakeWebSocket.CONNECTING;
      sent: string[] = [];
      onopen: Listener<() => void> = null;
      onmessage: Listener<(evt: MessageEvent) => void> = null;
      onclose: Listener<(evt: CloseEvent) => void> = null;
      send = jest.fn((message: string) => {
        this.sent.push(message);
      });
      close = jest.fn(() => {
        this.readyState = FakeWebSocket.CLOSING;
      });

      constructor(public url: string) {
        FakeWebSocket.instances.push(this);
      }
    };

    (global as any).WebSocket = FakeWebSocket;
  });

  afterEach(() => {
    wsBridge?.disconnect();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('stops flushing queued messages if the socket closes during the flush', async () => {
    const bridge = await loadBridge();
    const port = makePort();

    bridge.openConnection(port as any);
    const ws = FakeWebSocket.instances[0];

    port.emitMessage({ type: 'register', payload: { text: 'one' } });
    port.emitMessage({ type: 'updateText', payload: { text: 'two' } });

    ws.readyState = FakeWebSocket.OPEN;
    ws.send.mockImplementationOnce((message: string) => {
      ws.sent.push(message);
      ws.readyState = FakeWebSocket.CLOSED;
    });

    expect(() => ws.onopen?.()).not.toThrow();
    expect(ws.send).toHaveBeenCalledTimes(1);
  });

  it('does not send keepalive messages after the socket starts closing', async () => {
    const bridge = await loadBridge();
    const port = makePort();

    bridge.openConnection(port as any);
    const ws = FakeWebSocket.instances[0];

    ws.readyState = FakeWebSocket.OPEN;
    ws.onopen?.();
    ws.send.mockClear();

    ws.readyState = FakeWebSocket.CLOSING;
    jest.advanceTimersByTime(10 * 1000);

    expect(ws.send).not.toHaveBeenCalled();
  });

  it('ignores an old socket close when a newer socket is active', async () => {
    const bridge = await loadBridge();
    const firstPort = makePort();
    const secondPort = makePort();

    bridge.openConnection(firstPort as any);
    const firstWs = FakeWebSocket.instances[0];
    firstWs.readyState = FakeWebSocket.OPEN;
    firstWs.onopen?.();

    bridge.openConnection(secondPort as any);
    const secondWs = FakeWebSocket.instances[1];
    secondWs.readyState = FakeWebSocket.OPEN;
    secondWs.onopen?.();
    secondWs.send.mockClear();

    firstWs.readyState = FakeWebSocket.CLOSED;
    firstWs.onclose?.({
      code: 1000,
      reason: '',
      wasClean: true,
    } as CloseEvent);

    jest.advanceTimersByTime(10 * 1000);

    expect(secondWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'keepalive' }),
    );
  });
});
