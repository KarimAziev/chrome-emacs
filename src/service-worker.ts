import { wsBridge } from './background-tools';

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/content-script.js'],
    });
  }
});

chrome.runtime.onConnect.addListener((port) => {
  wsBridge.openConnection(port);
});
