// Move tab to a new blank window
chrome.windows.create({ tabId: tab.id, focused: true });