const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const {
  FakeAtomicChromeServer,
} = require('./support/fake-atomic-chrome-server');

const EXTENSION_PATH = path.resolve(__dirname, '..', 'chrome');
const FIXTURES_PATH = path.resolve(__dirname, 'fixtures');
const WS_PORT = Number(process.env.CHROME_EMACS_WS_PORT || 64293);

const getExtensionId = () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(EXTENSION_PATH, 'manifest.json'), 'utf8'),
  );
  if (typeof manifest.key !== 'string' || manifest.key.length === 0) {
    throw new Error('chrome/manifest.json must contain a public key for E2E');
  }

  const digest = crypto
    .createHash('sha256')
    .update(Buffer.from(manifest.key, 'base64'))
    .digest('hex')
    .slice(0, 32);

  return digest.replace(/[0-9a-f]/g, (digit) =>
    String.fromCharCode(97 + Number.parseInt(digit, 16)),
  );
};

const EXTENSION_ID = getExtensionId();

const getChromeExecutablePath = () => {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }

  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];

  const executablePath = candidates.find((candidate) =>
    fs.existsSync(candidate),
  );

  if (!executablePath) {
    throw new Error(
      'Set CHROME_EXECUTABLE_PATH to a Chrome or Chromium executable.',
    );
  }

  return executablePath;
};

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const resolveServedFile = (pathname) => {
  const filePath = path.resolve(FIXTURES_PATH, `.${pathname}`);
  const relative = path.relative(FIXTURES_PATH, filePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return filePath;
};

const serveFixtures = async () => {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const pathname = url.pathname === '/' ? '/plain-fields.html' : url.pathname;
    const filePath = resolveServedFile(pathname);

    if (!filePath) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      response.writeHead(200, {
        'content-type':
          contentTypes[path.extname(filePath)] || 'application/octet-stream',
      });
      response.end(data);
    });
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
      }),
  };
};

const waitForExtensionWorker = async (browser) => {
  const target = await browser.waitForTarget(
    (candidate) =>
      candidate.type() === 'service_worker' &&
      candidate.url().startsWith(`chrome-extension://${EXTENSION_ID}/`),
    { timeout: 10000 },
  );

  return target.worker();
};

const injectContentScriptIntoActiveTab = async (browser, page) => {
  await page.bringToFront();
  const worker = await waitForExtensionWorker(browser);

  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      throw new Error('No active tab available for content script injection');
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/content-script.js'],
      injectImmediately: true,
    });
  });
};

const waitForMonacoFixture = async (page) => {
  try {
    await page.waitForFunction(
      () =>
        window.chromeEmacsFixture?.ready || window.chromeEmacsFixture?.error,
      { timeout: 10000 },
    );
  } catch (error) {
    const state = await page.evaluate(() => ({
      fixture: window.chromeEmacsFixture,
      hasMonaco: typeof window.monaco,
    }));
    throw new Error(`Monaco fixture timed out: ${JSON.stringify(state)}`);
  }
  const error = await page.evaluate(() => window.chromeEmacsFixture.error);
  if (error) {
    throw new Error(`Failed to load Monaco fixture: ${error}`);
  }
};

describe('Chrome Emacs extension E2E', () => {
  let fixtureServer;
  let wsServer;
  let browser;
  let userDataDir;

  beforeAll(async () => {
    fixtureServer = await serveFixtures();
    wsServer = new FakeAtomicChromeServer({ port: WS_PORT });
    try {
      await wsServer.listen();
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        throw new Error(
          `Cannot run Chrome Emacs E2E tests while ws://localhost:${WS_PORT} is already in use. Stop the real Atomic Chrome/Chrome Emacs server and rerun npm run test:e2e:chrome.`,
        );
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (wsServer) {
      await wsServer.close();
    }
    if (fixtureServer) {
      await fixtureServer.close();
    }
  });

  beforeEach(async () => {
    wsServer.reset();

    browser = await puppeteer.launch({
      executablePath: getChromeExecutablePath(),
      headless: process.env.HEADLESS === 'false' ? false : 'new',
      pipe: true,
      enableExtensions: [EXTENSION_PATH],
      userDataDir: (userDataDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'chrome-emacs-e2e-'),
      )),
    });

    const worker = await waitForExtensionWorker(browser);
    await worker.evaluate(async () => {
      await chrome.storage.local.clear();
    });
  });

  afterEach(async () => {
    if (browser) {
      await browser.close();
    }
    browser = undefined;
    if (
      userDataDir &&
      userDataDir.startsWith(path.join(os.tmpdir(), 'chrome-emacs-e2e-'))
    ) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
    userDataDir = undefined;
  });

  test('syncs a focused textarea through the WebSocket bridge', async () => {
    const page = await browser.newPage();
    await page.goto(`${fixtureServer.baseUrl}/plain-fields.html`);
    await page.focus('#main-textarea');

    const registerPromise = wsServer.waitForMessage(
      (message) => message.type === 'register',
    );

    await injectContentScriptIntoActiveTab(browser, page);

    const { client, message: registerMessage } = await registerPromise;
    expect(registerMessage.payload.text).toContain('First textarea line');
    expect(registerMessage.payload.url).toBe(
      `${fixtureServer.baseUrl}/plain-fields.html`,
    );
    expect(registerMessage.payload.title).toBe(
      'Chrome Emacs E2E: Plain Fields',
    );

    wsServer.send(client, {
      type: 'updateText',
      payload: {
        text: 'Updated from fake Emacs\nSecond line',
        selections: [{ start: 7, end: 7 }],
      },
    });

    await page.waitForFunction(
      () =>
        document.querySelector('#main-textarea').value ===
        'Updated from fake Emacs\nSecond line',
    );

    const updatePromise = wsServer.waitForMessage(
      (message) =>
        message.type === 'updateText' &&
        message.payload.text.includes('local browser edit'),
    );

    await page.type('#main-textarea', ' local browser edit');

    const { message: updateMessage } = await updatePromise;
    expect(updateMessage.payload.text).toContain('local browser edit');
  });

  test('can register visible inputs when the option is enabled', async () => {
    const page = await browser.newPage();
    const worker = await waitForExtensionWorker(browser);

    await worker.evaluate(async () => {
      await chrome.storage.local.set({ allowVisibleInputs: true });
    });

    await page.goto(`${fixtureServer.baseUrl}/plain-fields.html`);
    await page.focus('#main-input');

    const registerPromise = wsServer.waitForMessage(
      (message) => message.type === 'register',
    );

    await injectContentScriptIntoActiveTab(browser, page);

    const { message: registerMessage } = await registerPromise;
    expect(registerMessage.payload.text).toBe('Visible input value');
    expect(registerMessage.payload.lineNumber).toBe(1);
  });

  test('follows file switches when Monaco requires the injected-editor fallback', async () => {
    const page = await browser.newPage();
    await page.goto(`${fixtureServer.baseUrl}/hacked-monaco.html`);
    await waitForMonacoFixture(page);
    await page.evaluate(() => window.chromeEmacsFixture.focusHostEditor());

    const registerPromise = wsServer.waitForMessage(
      (message) => message.type === 'register',
    );

    await injectContentScriptIntoActiveTab(browser, page);

    const { client, message: registerMessage } = await registerPromise;
    expect(registerMessage.payload.text).toBe(
      'export const firstFile = "first";\n',
    );

    await page.waitForFunction(
      () =>
        document.querySelectorAll('#editor-host > .monaco-editor[role="code"]')
          .length === 2,
    );

    const switchedPromise = wsServer.waitForMessage(
      (message) =>
        message.type === 'updateText' &&
        message.payload.text === 'export const secondFile = "second";\n',
    );

    await page.click('#switch-second');
    await switchedPromise;

    wsServer.send(client, {
      type: 'updateText',
      payload: {
        text: 'export const secondFile = "updated from Emacs";\n',
        lineNumber: 1,
        column: 1,
      },
    });

    await page.waitForFunction(
      () =>
        window.chromeEmacsFixture.secondModel.getValue() ===
        'export const secondFile = "updated from Emacs";\n',
    );

    const values = await page.evaluate(() => ({
      first: window.chromeEmacsFixture.firstModel.getValue(),
      second: window.chromeEmacsFixture.secondModel.getValue(),
    }));
    expect(values).toEqual({
      first: 'export const firstFile = "first";\n',
      second: 'export const secondFile = "updated from Emacs";\n',
    });

    const returnedPromise = wsServer.waitForMessage(
      (message) =>
        message.type === 'updateText' &&
        message.payload.text === 'export const firstFile = "first";\n',
    );

    await page.click('#switch-first');
    await returnedPromise;

    wsServer.send(client, {
      type: 'updateText',
      payload: {
        text: 'export const firstFile = "updated after return";\n',
        lineNumber: 1,
        column: 1,
      },
    });

    await page.waitForFunction(
      () =>
        window.chromeEmacsFixture.firstModel.getValue() ===
        'export const firstFile = "updated after return";\n',
    );

    expect(
      await page.evaluate(() => ({
        first: window.chromeEmacsFixture.firstModel.getValue(),
        second: window.chromeEmacsFixture.secondModel.getValue(),
      })),
    ).toEqual({
      first: 'export const firstFile = "updated after return";\n',
      second: 'export const secondFile = "updated from Emacs";\n',
    });
  });

  test('refuses Emacs writes when a hacked Monaco target becomes ambiguous', async () => {
    const page = await browser.newPage();
    await page.goto(`${fixtureServer.baseUrl}/hacked-monaco.html`);
    await waitForMonacoFixture(page);
    await page.evaluate(() => window.chromeEmacsFixture.focusHostEditor());

    const registerPromise = wsServer.waitForMessage(
      (message) => message.type === 'register',
    );

    await injectContentScriptIntoActiveTab(browser, page);

    const { client } = await registerPromise;
    await page.waitForFunction(
      () =>
        document.querySelectorAll('#editor-host > .monaco-editor[role="code"]')
          .length === 2,
    );

    await page.click('#switch-ambiguous');
    await new Promise((resolve) => setTimeout(resolve, 100));

    wsServer.send(client, {
      type: 'updateText',
      payload: {
        text: 'this must not be written to either model',
        lineNumber: 1,
        column: 1,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    const values = await page.evaluate(() => ({
      first: window.chromeEmacsFixture.firstModel.getValue(),
      second: window.chromeEmacsFixture.secondModel.getValue(),
    }));
    expect(values).toEqual({
      first: 'export const firstFile = "first";\n',
      second: 'export const secondFile = "second";\n',
    });

    const recoveredPromise = wsServer.waitForMessage(
      (message) =>
        message.type === 'updateText' &&
        message.payload.text === 'export const secondFile = "second";\n',
    );
    await page.click('#switch-second');
    await recoveredPromise;

    wsServer.send(client, {
      type: 'updateText',
      payload: {
        text: 'export const secondFile = "safe after recovery";\n',
        lineNumber: 1,
        column: 1,
      },
    });
    await page.waitForFunction(
      () =>
        window.chromeEmacsFixture.secondModel.getValue() ===
        'export const secondFile = "safe after recovery";\n',
    );

    expect(
      await page.evaluate(() =>
        window.chromeEmacsFixture.firstModel.getValue(),
      ),
    ).toBe('export const firstFile = "first";\n');
  });
});
