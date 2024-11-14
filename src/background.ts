let extensionWindowId: number | undefined;

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
