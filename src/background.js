// src/background.js

// Listener for extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error("Error opening side panel:", error);
  }
});

// Listener for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message in background.js:", message);

  if (message.action === "fetchData") {
    // Perform data fetching or other background tasks
    fetchDataFromAPI(message.url).then(data => sendResponse(data));
    return true; // Indicates asynchronous response
  }

  // Handle injectContentScript message from the sidebar
  if (message.action === "injectContentScript") {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        // Validate the tab URL
        if (!activeTab.url.startsWith("http")) {
          sendResponse({ status: "error", message: "Invalid tab: Content scripts can only be injected into HTTP/HTTPS pages." });
          return;
        }
        // Inject the content script into the active tab
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ["src/content.js"]
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error injecting content script:", chrome.runtime.lastError.message);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
          } else {
            console.log("Content script successfully injected into:", activeTab.url);
            sendResponse({ status: "success", tabId: activeTab.id, url: activeTab.url });
          }
        });
      } else {
        sendResponse({ status: "error", message: "No active tab found" });
      }
    });
    return true; // Indicates asynchronous response
  }
});

// Function to fetch data from an API
async function fetchDataFromAPI(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching data from API:", error);
    throw error;
  }
}