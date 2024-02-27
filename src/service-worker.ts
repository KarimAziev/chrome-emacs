import { wsBridge } from '@/background-tools';

/**
 * Adds an event listener to the Chrome extension's action button (e.g., toolbar icon).
 * On click, it injects the 'content-script.js' into the current tab.
 */
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/content-script.js'],
    });
  }
});

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

    const activeTab = tabs.find((tab) => {
      return tab.active;
    });
    if (activeTab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['scripts/query-edit.js'],
      });
    }
  }
});
