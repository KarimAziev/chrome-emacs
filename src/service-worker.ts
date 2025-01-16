import { wsBridge } from '@/background-tools';

const currentBrowser = process.env.BROWSER_TARGET;
const isFirefox = currentBrowser === 'firefox';

const handleTabAction = (tab: chrome.tabs.Tab) => {
  if (!tab.id) {
    return;
  }
  chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    files: ['scripts/content-script.js'],
  });
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
        target: { tabId: activeTab.id, allFrames: true },
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
  const handlers: { [key: string]: (tab: chrome.tabs.Tab) => void } = {
    ['chrome-emacs-edit']: handleTabAction,
  };
  const tabHandler = handlers[menuItemId];

  if (tabHandler) {
    tabHandler(tab);
  }
});
