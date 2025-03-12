// content.js
console.log("Content script loaded!"); // Keep this for debugging

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    console.log("Content script received getPageContent message"); // Debugging
    try {
      const pageContent = document.body.innerText; // Or any other method to extract content
      console.log("Extracted page content:", pageContent.substring(0, 100) + "...");  // Log a snippet
      sendResponse({ data: pageContent, status: "success" }); // Include status: success
    } catch (error) {
      console.error("Error extracting page content:", error);
      sendResponse({ status: "error", message: "Error extracting content: " + error.message });
    }
    return true; // Keep the message channel open!
  }
    return false;
});