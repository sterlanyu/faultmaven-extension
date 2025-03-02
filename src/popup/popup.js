document.addEventListener("DOMContentLoaded", () => {
  const toggleSidebarButton = document.getElementById("toggle-sidebar");

  if (!toggleSidebarButton) {
    console.error("Toggle sidebar button not found.");
    return;
  }

  toggleSidebarButton.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        console.error("No active tab found.");
        return;
      }

      // Inject content.js into the active tab
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["src/content.js"],
      });

      console.log("Content script injected successfully!");

      // Send a message to the content script to toggle the sidebar
      const response = await chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
      console.log("Response from content script:", response);

      // Update button text based on sidebar state
      if (response && response.sidebarVisible) {
        toggleSidebarButton.textContent = "Hide Sidebar";
      } else {
        toggleSidebarButton.textContent = "Show Sidebar";
      }
    } catch (error) {
      console.error("Error toggling sidebar:", error);
    }
  });
});

