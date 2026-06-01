// extension/background.js

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "codeshield-explain",
    title: "Explain in CodeShield",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "codeshield-explain") {
    const selectedText = info.selectionText;
    if (selectedText) {
      // Production URL — works from anywhere without local server
      const BASE_URL = "https://codeshield-2876.onrender.com";
      
      const encodedCode = encodeURIComponent(selectedText);
      // Use hash fragment (#) instead of query string (?) so the code
      // is never sent to the server — this bypasses Render's WAF.
      const url = `${BASE_URL}/#code=${encodedCode}`;
      
      chrome.tabs.create({ url });
    }
  }
});
