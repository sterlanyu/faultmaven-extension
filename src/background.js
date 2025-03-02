// src/background.js

// Ensure content script is injected on page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url.startsWith("http")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["src/content.js"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error injecting content script:", chrome.runtime.lastError.message);
      } else {
        console.log("Content script successfully injected into:", tab.url);
      }
    });
  }
});

// Listener for extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    console.log("Side panel opened");
  } catch (error) {
    console.error("Error opening side panel:", error);
  }
});

// Listener for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message in background.js:", message);

  if (message.action === 'fetchData') {
    // Perform data fetching or other background tasks
    fetchDataFromAPI(message.url).then(data => sendResponse(data));
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

// Example: Listen for tab activation to inject content script
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && tab.url.startsWith("http")) {
      chrome.scripting.executeScript({
        target: { tabId: activeInfo.tabId },
        files: ["src/content.js"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error injecting content script:", chrome.runtime.lastError.message);
        } else {
          console.log("Content script successfully injected into:", tab.url);
        }
      });
    }
  });
});

