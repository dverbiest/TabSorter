let extensionWindowId: number | undefined;
let lastActivity = Date.now();
let reload = false;

function createExtensionWindow() {
  chrome.system.display.getInfo((displays) => {
    const displayHeight = displays[0].workArea.height || 800;
    chrome.windows.create({
      url: 'index.html',
      type: 'popup',
      top: 0,
      left: 0,
      width: 400,
      height: displayHeight
    }, (window) => {
      extensionWindowId = window?.id;
    });
  });
}

function openOrFocusExtensionWindow() {
  if (extensionWindowId) {
    chrome.windows.update(extensionWindowId, { focused: true }, (window) => {
      if (chrome.runtime.lastError || !window) {
        // If the window no longer exists, create a new one
        createExtensionWindow();
      }
    });
  } else {
    createExtensionWindow();
  }
}

chrome.runtime.onInstalled.addListener(openOrFocusExtensionWindow);
chrome.action.onClicked.addListener(openOrFocusExtensionWindow);
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open_extension_window') {
    openOrFocusExtensionWindow();
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === extensionWindowId)
    extensionWindowId = undefined;
});

chrome.tabs.onCreated.addListener(() => trackActivity);
chrome.tabs.onRemoved.addListener(() => trackActivity);
chrome.tabs.onActivated.addListener(() => trackActivity);
chrome.tabs.onUpdated.addListener(() => trackActivity);
chrome.windows.onFocusChanged.addListener(() => trackActivity);

function trackActivity() {
  const now = Date.now();
  if (reload) {
    chrome.tabs.query({ windowId: extensionWindowId }, (tabs) => {
      if (tabs[0].id) chrome.tabs.reload(tabs[0].id);
    });
    reload = false;
  }
  lastActivity = now;
}

setInterval(() => {
  const now = Date.now();
  if (now - lastActivity > 60 * 1000) reload = true;
}, 1000);
