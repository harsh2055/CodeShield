// extension/background.js

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "codelens-explain",
    title: "Explain in CodeLens",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "codelens-explain") {
    const selectedText = info.selectionText;
    if (selectedText) {
      // BASE_URL defaults to localhost for development.
      // Update this to your deployed URL when pushing to production.
      const BASE_URL = "http://localhost:3000";
      
      const encodedCode = encodeURIComponent(selectedText);
      const url = `${BASE_URL}/?code=${encodedCode}`;
      
      chrome.tabs.create({ url });
    }
  }
});
