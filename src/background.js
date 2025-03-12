// src/background.js

// Listener for extension icon click (REQUIRED for initial sidebar opening)
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error("Error opening side panel:", error);
  }
});

// Listener for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message in background.js:", request, "from:", sender);

    if (request.action === "getPageContent") {
        // Get the current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                console.error("No active tab found.");
                sendResponse({ status: "error", message: "No active tab found." });
                return; // Early return on error
            }
            const tab = tabs[0];
            // Validate that tab and tab.url exist before calling startsWith
            if (!tab || !tab.url || !tab.url.startsWith("http")) {
                console.error("Invalid tab URL:", tab);
                sendResponse({ status: "error", message: "Invalid tab: Content scripts can only be injected into HTTP/HTTPS pages." });
                return; // Early return on error
            }
            if(!tab.id){
              console.error("Invalid tab id:", tab.id);
              sendResponse({status: "error", message: "No active tab id."});
              return; // Early return on error
            }

            // Inject the content script into the current tab
            console.log("Injecting content script into tab:", tab.id);
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/content.js']  // Inject content.js
            }).then(() => {
                console.log("Content script injected. Sending getPageContent message.");
                // Once injected, send a message to the content script
                chrome.tabs.sendMessage(tab.id, { action: "getPageContent" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error in sendMessage callback:", chrome.runtime.lastError);
                        sendResponse({ status: "error", message: chrome.runtime.lastError.message || "Unknown sendMessage error" }); //More defensive
                        return; //  CRITICAL: Return after sending error response
                    }

                    if (response && response.status === "success" && response.data) {
                        sendResponse({ status: "success", data: response.data, url: tab.url });
                    } else {
                        // Handle the case where the response is invalid/missing data.
                        console.error("Invalid response from content script:", response);
                        sendResponse({ status: "error", message: response?.message || "Failed to get page data." }); // Use optional chaining
                        return; // CRITICAL: Return here
                    }
                });
            }).catch(err => {
                console.error('Failed to inject content script: ', err);
                sendResponse({status: "error", message: err.message});
            });
        });
        return true; // Important: Keep the message channel open for the async response.

    } else if (request.action === "getSessionId") {
        // Retrieve the session ID from storage, or create a new one
        chrome.storage.local.get(["sessionId"], (result) => {
            if (result.sessionId) {
                sendResponse({ sessionId: result.sessionId });
            } else {
                // Generate a new session ID and store it
                const newSessionId = generateUUID();  // Use a helper function
                chrome.storage.local.set({ sessionId: newSessionId }, () => {
                    sendResponse({ sessionId: newSessionId });
                });
            }
        });
        return true; // Keep the message channel open

    } else if (request.action === "clearSession") {
        // Clear the session ID from storage
        chrome.storage.local.remove("sessionId", () => {
          sendResponse({status: "success"});
        });
        return true; // Keep the message channel open
    }
    return false; // Important.
});

// Helper function to generate a UUID (for session IDs)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}