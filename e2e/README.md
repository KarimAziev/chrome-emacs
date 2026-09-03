# Chrome Emacs E2E Fixtures

This directory contains browser-level test fixtures for the Chrome extension.

## HTML fixtures

- `fixtures/plain-fields.html` covers dependency-free textareas, contenteditable blocks, visible inputs, and negative cases.
- `fixtures/hacked-monaco.html` reproduces a host-owned Monaco instance that does not expose `getEditors()`, forcing the extension's injected-editor fallback and exercising file switches.
- `fixtures/editor-matrix.html` loads Ace, CodeMirror 5, CodeMirror 6, Monaco, CKEditor 4, and CKEditor 5 from public CDNs for manual regression checks against real editor DOMs.
- `fixtures/scenarios.html` covers dynamic fields, shadow DOM, same-origin iframes, and initially offscreen fields.

Serve these files over HTTP before testing the extension manually. This is the closest match to normal extension usage and does not require Chrome's file URL access toggle.

```sh
python3 -m http.server 8080 --directory e2e/fixtures
```

Opening the fixtures directly with `file://` can also work in Chrome if
`chrome://extensions` has "Allow access to file URLs" enabled for Chrome Emacs.

## Automated Chrome test

The automated suite uses Puppeteer, loads the local `chrome/` extension bundle, and starts a fake Atomic Chrome WebSocket server on the test-only `ws://localhost:64293`, so it can run while the real Emacs server is listening on port 64292.

```sh
npm run test:e2e:chrome
```

The test derives the Chrome extension ID from the public `key` field in `chrome/manifest.json`. That key keeps unpacked test builds on the same ID as the Chrome Web Store item.

Set `HEADLESS=false` to watch the test run:

```sh
HEADLESS=false npm run test:e2e:chrome
```

If Chrome is not installed in a standard location, set:

```sh
CHROME_EXECUTABLE_PATH=/path/to/chrome npm run test:e2e:chrome
```
