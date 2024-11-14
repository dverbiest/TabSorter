import { updateWindowLists } from './windowUtils';
import { restoreLastAction } from './tabUtils';

export function initializeEventListeners() {
  chrome.tabs.onCreated.addListener(() => {
    console.log('Tab created');
    updateWindowLists();
  });
  chrome.tabs.onRemoved.addListener(() => {
    console.log('Tab removed');
    updateWindowLists();
  });
  chrome.tabs.onMoved.addListener(() => {
    console.log('Tab moved');
    updateWindowLists();
  });
  chrome.tabs.onActivated.addListener(() => {
    console.log('Tab activated');
    updateWindowLists();
  });
  chrome.tabs.onUpdated.addListener((id, changeInfo) => {
    console.log('Tab updated:', id, changeInfo);
    if (changeInfo.status === 'complete' || changeInfo.title !== undefined || changeInfo.pinned !== undefined)
      updateWindowLists();
  });
  chrome.windows.onCreated.addListener(() => {
    console.log('Window created');
    updateWindowLists();
  });
  chrome.windows.onRemoved.addListener(() => {
    console.log('Window removed');
    updateWindowLists();
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      console.log('Undo last action');
      restoreLastAction();
    }
  });
}
