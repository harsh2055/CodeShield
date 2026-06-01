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
      // Production URL — works from anywhere without local server
      const BASE_URL = "https://codeshield-2876.onrender.com";
      
      const encodedCode = encodeURIComponent(selectedText);
      const url = `${BASE_URL}/?code=${encodedCode}`;
      
      chrome.tabs.create({ url });
    }
  }
});
