import { showToast } from './toastUtils';
import { saveWindowTitle } from './windowUtils';

let lastClosedTab: string;
let lastAction: 'closedTab' | 'mergedWindows' | null = null;
let lastMergedWindows: { windowTitle: string, fromWindowId: number, toWindowId: number, tabs: chrome.tabs.Tab[] } | null = null;

export function restoreLastAction() {
  if (lastAction === 'closedTab' && lastClosedTab) {
    chrome.sessions.restore(lastClosedTab, () => {
      lastClosedTab = '';
      lastAction = null;
    });
    showToast('Tab restored.');
  } else if (lastAction === 'mergedWindows' && lastMergedWindows) {
    const { windowTitle, tabs } = lastMergedWindows;
    chrome.windows.create({ tabId: tabs[0].id }, (newWindow) => {
      const newWindowId = newWindow!.id!;
      if (tabs[0].pinned) chrome.tabs.update(tabs[0].id!, { pinned: true });
      tabs.slice(1).forEach((tab, index) => {
        chrome.tabs.move(tab.id!, { windowId: newWindowId, index: index + 1 });
        if (tab.pinned) chrome.tabs.update(tab.id!, { pinned: true });
      })
      saveWindowTitle(newWindowId, windowTitle || '');
    })
    lastMergedWindows = null;
    lastAction = null;
    showToast('Merge undone.');
  }
}

export function closeTab(tabId: number) {
  chrome.tabs.remove(tabId, () => {
    chrome.sessions.getRecentlyClosed({ maxResults: 1 }, (sessions) => {
      lastClosedTab = sessions[0]?.tab?.sessionId || '';
      lastAction = 'closedTab';
      showToast('Tab closed.', true);
    });
  });
}

export function mergeWindows(windowTitle: string, fromWindowId: number, toWindowId: number) {
  chrome.tabs.query({ windowId: fromWindowId }, (tabs) => {
    lastMergedWindows = { windowTitle, fromWindowId, toWindowId, tabs };
    tabs.forEach((tab, index) => {
      chrome.tabs.move(tab.id!, { windowId: toWindowId, index }, () => {
        if (tab.pinned) chrome.tabs.update(tab.id!, { pinned: true });
      });
    });
    lastAction = 'mergedWindows';
    showToast('Windows merged.', true);
  });
}
