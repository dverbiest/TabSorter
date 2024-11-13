import { showToast } from './toastUtils';

let lastClosedTab: string;
let lastActionClosedTab = false;

export function restoreLastClosedTab() {
  if (lastActionClosedTab && lastClosedTab) {
    chrome.sessions.restore(lastClosedTab, () => {
      lastClosedTab = '';
      lastActionClosedTab = false;
    });
  }
}

export function handleTabClose(tabId: number) {
  chrome.tabs.remove(tabId, () => {
    chrome.sessions.getRecentlyClosed({ maxResults: 1 }, (sessions) => {
      lastClosedTab = sessions[0]?.tab?.sessionId || '';
      lastActionClosedTab = true;
      showToast('Tab closed.');
    });
  });
}
