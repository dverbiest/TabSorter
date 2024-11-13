import { updateWindowLists } from './windowUtils';
import { restoreLastClosedTab } from './tabUtils';

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
      console.log('Restore last closed tab');
      restoreLastClosedTab();
    }
  });

  // let lastActivity = Date.now();
  // let reload = false;

  // function trackActivity() {
  //   const now = Date.now();
  //   if (reload) {
  //     location.reload();
  //     reload = false;
  //   }
  //   lastActivity = now;
  // }

  // document.addEventListener('mousemove', trackActivity);

  // setInterval(() => {
  //   const now = Date.now();
  //   if (now - lastActivity > 3 * 1000) {
  //     console.log('Pending reload');
  //     reload = true;
  //   }
  // }, 1000);
}
