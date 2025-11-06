import { wsBridge } from '@/background-tools';
import type { MessageClickPayload } from '@/handlers/types';
import { clickSimulator } from '@/content-script-tools/simulate-click';
import { FORCE_VISIBLE_INPUTS_FLAG } from '@/options/runtime-settings';
import { MODULE_REGISTRY_KEY } from '@/module-bridge/registry';

const currentBrowser = process.env.BROWSER_TARGET;
const isFirefox = currentBrowser === 'firefox';

type HandleTabActionOptions = {
  forceAllowVisibleInputs?: boolean;
};

const LOAD_ACTIVE_ELEMENT_MODULE_PATH =
  'scripts/module/load-active-element-handler.js';

const executeModuleFunction = async <ResultType>(
  target: chrome.scripting.InjectionTarget,
  modulePath: string,
  functionName: string,
  args: unknown[] = [],
) => {
  await chrome.scripting.executeScript({
    target,
    files: [modulePath],
    injectImmediately: true,
  });

  return chrome.scripting.executeScript<
    [string, string, unknown[]],
    Promise<ResultType>
  >({
    target,
    injectImmediately: true,
    func: async (registryKey, fnName, fnArgs) => {
      const registry = Reflect.get(globalThis, registryKey as string) as
        | Record<string, (...fnArgs: unknown[]) => unknown>
        | undefined;

      if (!registry) {
        const errMsg = `Chrome Emacs module registry "${registryKey as string}" missing`;
        console.error(errMsg);
        throw new Error(errMsg);
      }

      const fn = registry[fnName as string];

      if (typeof fn !== 'function') {
        const errMsg = `Chrome Emacs module "${fnName as string}" is not available`;
        console.error(errMsg);
        throw new Error(errMsg);
      }

      const result = await fn(...(fnArgs || []));

      return result as ResultType;
    },
    args: [MODULE_REGISTRY_KEY, functionName, args],
  });
};

const handleTabAction = async (
  tab: chrome.tabs.Tab,
  options: HandleTabActionOptions = {},
) => {
  if (!tab.id) {
    return;
  }

  const { forceAllowVisibleInputs = false } = options;
  let overrideApplied = false;

  if (forceAllowVisibleInputs) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      injectImmediately: true,
      func: (flagName: string) => {
        Reflect.set(globalThis, flagName, true);
      },
      args: [FORCE_VISIBLE_INPUTS_FLAG],
    });
    overrideApplied = true;
  }

  try {
    const frames = await executeModuleFunction<boolean>(
      { tabId: tab.id, allFrames: true },
      LOAD_ACTIVE_ELEMENT_MODULE_PATH,
      'loadActiveElementHandler',
    );

    const found = frames.find((res) => res.result);

    if (found) {
      return;
    }

    const mainFrames = await chrome.scripting.executeScript<
      any,
      Promise<boolean>
    >({
      target: { tabId: tab.id },
      injectImmediately: true,
      func: async () => {
        try {
          const [{ ElementReader }, { RuntimeSettings }] = await Promise.all([
            import('@/content-script-tools/element-reader'),
            import('@/options/runtime-settings'),
          ]);
          await RuntimeSettings.ensureLoaded();
          const len = ElementReader.getElems().length;
          return len > 0;
        } catch (error) {
          return false;
        }
      },
    });

    if (mainFrames.find(({ result }) => result)) {
      await chrome.scripting.executeScript({
        files: ['scripts/content-script.js'],
        target: { tabId: tab.id },
        injectImmediately: true,
      });
    } else {
      await chrome.scripting.executeScript<any, Promise<number>>({
        target: { tabId: tab.id, allFrames: true },
        injectImmediately: true,
        files: ['scripts/content-script.js'],
      });
    }
  } finally {
    if (overrideApplied) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        injectImmediately: true,
        func: (flagName: string) => {
          Reflect.deleteProperty(globalThis, flagName);
        },
        args: [FORCE_VISIBLE_INPUTS_FLAG],
      });
    }
  }
};

if (isFirefox) {
  chrome.alarms.create('keepAliveAlarm', { periodInMinutes: 0.1 });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAliveAlarm') {
      // Perform a lightweight task to keep the service worker alive
      chrome.runtime.getPlatformInfo((info) => {
        console.log(
          `Alarm triggered: keeping service worker alive. Platform info: ${info.os}`,
        );
      });
    }
  });
}

chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === 'simulate-click') {
    const tabId = sender.tab && sender.tab.id;

    if (!tabId) {
      return;
    }

    const framesRated = await chrome.scripting.executeScript<
      [MessageClickPayload, boolean],
      number
    >({
      target: { tabId: tabId, allFrames: true },
      injectImmediately: true,
      args: [message.payload, false],
      func: clickSimulator,
    });

    const frames = framesRated.sort((a, b) => b.result - a.result);

    const targetFrame = frames[0];

    if (targetFrame && targetFrame.result > 0) {
      await chrome.scripting.executeScript<
        [MessageClickPayload, boolean],
        void
      >({
        target: { tabId: tabId, frameIds: [targetFrame.frameId] },
        injectImmediately: true,
        args: [message.payload, true],
        func: clickSimulator,
      });
    } else {
      await chrome.scripting.executeScript({
        files: ['scripts/click-error.js'],
        target: { tabId: tabId, frameIds: [targetFrame.frameId] },
        injectImmediately: true,
      });
    }
  }
});
/**
 * Adds an event listener to the Chrome extension's action button (e.g., toolbar icon).
 * On click, it injects the 'content-script.js' into the current tab.
 */
chrome.action.onClicked.addListener(handleTabAction);

/**
 * Listens for a connection to the Chrome runtime (extension) and opens a WebSocket
 * bridge connection for the connected port.
 */
chrome.runtime.onConnect.addListener((port) => {
  wsBridge.openConnection(port);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'query-edit') {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    const activeTab = tabs.find((tab) => tab.active);
    if (activeTab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['scripts/query-edit.js'],
      });
    }
  }
});

/**
 * Create context menu once to prevent the error: "Cannot create item with duplicate id chrome-emacs-edit"
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'chrome-emacs-edit',
    title: 'Edit with Chrome Emacs',
    contexts: ['editable'],
  });
});

chrome.contextMenus.onClicked.addListener(({ menuItemId }, tab) => {
  if (!tab) {
    return;
  }

  if (menuItemId === 'chrome-emacs-edit') {
    void handleTabAction(tab, { forceAllowVisibleInputs: true });
  }
});
