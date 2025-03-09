// --- Constants ---
const BACKEND_URL = "http://127.0.0.1:8000";
const DATA_SOURCE_TEXT = "text";
const DATA_SOURCE_FILE = "file";
const DATA_SOURCE_PAGE = "page";
const PADDING_OFFSET = 20;

// --- DOM Elements ---
const sidebarContainer = document.getElementById("sidebar-container");
const queryInput = document.getElementById("query-input");
const dataInput = document.getElementById("data-input");
const fileInput = document.getElementById("file-input");
const injectButton = document.getElementById("inject-button");
const conversationHistory = document.getElementById("conversation-history");
const submitDataBtn = document.getElementById("submit-data");
const loadingIndicator = document.getElementById("loading-indicator");
const injectionStatus = document.getElementById("injection-status");
const dataSourceOptions = document.querySelectorAll('input[name="data-source"]');
const newConversationButton = document.getElementById("new-conversation");

// --- State Management ---
let sessionId = null;
let pageContent = null;

// --- Helper Functions ---

// Function to resize elements dynamically
function resizeElements() {
  const containerWidth = sidebarContainer.offsetWidth;
  const containerHeight = sidebarContainer.offsetHeight;

  // Calculate the available width for input elements
  const availableWidth = containerWidth - PADDING_OFFSET * 2; // Account for padding on both sides

  // Resize input elements
  const elements = [queryInput, dataInput, fileInput, injectButton, submitDataBtn, loadingIndicator, newConversationButton];
  elements.forEach(element => {
    if (element) {
      element.style.width = `${availableWidth}px`;
    }
  });

  // Calculate conversationHistory height
  const otherElements = [queryInput, dataInput, fileInput, injectButton, submitDataBtn, newConversationButton];
  let totalOtherHeights = 0;
  otherElements.forEach(element => {
    if (element) {
      totalOtherHeights += element.offsetHeight;
    }
  });

  // Add margins and paddings
  totalOtherHeights += 40 + PADDING_OFFSET;

  if (conversationHistory) {
    conversationHistory.style.height = `${containerHeight - totalOtherHeights}px`;
  }
}

// Function to add conversation history items
function addToConversationHistory(query, response, isError = false) {
  const item = document.createElement("div");
  item.className = `conversation-item ${isError ? "error-response" : ""}`;

  if (query) {
    const queryItem = document.createElement("div");
    queryItem.className = "user-question";
    queryItem.innerHTML = `<p><strong>You:</strong> ${query}</p>`;
    item.appendChild(queryItem);
  }

  if (response) {
    const responseItem = document.createElement("div");
    responseItem.className = "faultmaven-response";
    responseItem.innerHTML = `<p><strong>FaultMaven:</strong> ${response}</p>`;
    item.appendChild(responseItem);
  }

  conversationHistory.appendChild(item);
  conversationHistory.scrollTop = conversationHistory.scrollHeight;
}

// Function to display a loading indicator
function showLoading(isLoading) {
  loadingIndicator.style.display = isLoading ? "block" : "none";
}

// Function to display an error message in the conversation history
function displayErrorMessage(message) {
    addToConversationHistory("", `<p style='color: red;'>⚠️ ${message}</p>`, true);
}

// Function to handle backend communication
async function communicateWithBackend(endpoint, method, headers, body) {
  const url = `${BACKEND_URL}${endpoint}`;
  const options = { method, headers };

  if (body) {
    options.body = JSON.stringify(body);
  }
  showLoading(true);

  try {
    const response = await fetch(url, options);
    const newSessionId = response.headers.get("X-Session-ID");
    if (newSessionId) {
      sessionId = newSessionId;
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(`HTTP error! Status: ${response.status} - ${errorData.message || "Unknown error"}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
      console.error("❌ Error communicating with backend:", error);
      displayErrorMessage(`Error processing request: ${error.message}. Please try again.`);
      throw error; // Re-throw to be handled by the caller
  } finally {
    showLoading(false);
  }
}

// --- Core Functions ---
// Function to send a query to the backend
async function sendToFaultMaven(query) {
  const headers = { "Content-Type": "application/json" };
  if (sessionId) {
    headers["X-Session-ID"] = sessionId;
  }
  try {
    const result = await communicateWithBackend("/query", "POST", headers, { query });

    if (result && result.response) {
      addToConversationHistory(query, result.response);
      // Display any additional message from the server
      if (result.message) {
        addToConversationHistory("", result.message, true); // Display as an error/info message
      }
    } else {
      displayErrorMessage("Unexpected response format.");
    }
  } catch (error) {
      // Error is handled in communicateWithBackend, no additional actions needed here.
  }
}

// Function to send data to the backend
async function sendDataToFaultMaven(data, dataType) {
  const headers = {};
  let payload;
  if (sessionId) {
    headers["X-Session-ID"] = sessionId;
  }
  if (dataType === DATA_SOURCE_TEXT || dataType === DATA_SOURCE_FILE) {
    headers["Content-Type"] = "application/json";
    payload = { text: data };
  }

  try {
    const result = await communicateWithBackend("/data", "POST", headers, payload);

    if (result && result.summary) {
      addToConversationHistory("", `Data Upload Success: ${result.summary}`);
        // Check for and display any message sent by the server.
        if (result.message) {
          addToConversationHistory("", result.message, true); // Display as an error/info message
        }
    } else {
        displayErrorMessage("Data upload failed. Unexpected response format.");
    }
  } catch (error) {
    // Error is handled in communicateWithBackend, no additional actions needed here.
  }
}

// --- Event Handlers ---
// Handle data source selection
dataSourceOptions.forEach(option => {
  option.addEventListener("change", () => {
    const selectedSource = option.value;

    // Show/hide elements based on selection
    dataInput.style.display = selectedSource === DATA_SOURCE_TEXT ? "block" : "none";
    fileInput.style.display = selectedSource === DATA_SOURCE_FILE ? "block" : "none";
    injectButton.style.display = selectedSource === DATA_SOURCE_PAGE ? "block" : "none";

    // Clear the status message when a different source is selected
    if (selectedSource !== DATA_SOURCE_PAGE) {
      injectionStatus.textContent = "";
      injectionStatus.className = "";
    }
  });
});

// Handle file upload
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        dataInput.value = e.target.result; // Populate the textarea with file content
      };
      await reader.readAsText(file);
    } catch (error) {
      console.error("Error reading file:", error);
      injectionStatus.textContent = "⚠️ Error reading file.";
      injectionStatus.className = "error";
    }
  }
});

// Handle inject button click
injectButton.addEventListener("click", async () => {
  injectButton.disabled = true;
  injectButton.textContent = "Analyzing...";
  injectionStatus.textContent = "Analyzing page...";
  injectionStatus.className = "loading";

  try {
    const response = await chrome.runtime.sendMessage({ action: "injectContentScript" });

    if (response && response.status === "success") {
      injectionStatus.textContent = `✅ Page selected (${response.url})`;
      injectionStatus.className = "success";
      pageContent = response.data; // Store the page content for later submission
    } else {
      injectionStatus.textContent = `⚠️ ${response.message}`;
      injectionStatus.className = "error";
    }
  } catch (error) {
    console.error("Error injecting content script:", error);
    injectionStatus.textContent = "⚠️ Error analyzing page.";
    injectionStatus.className = "error";
  } finally {
    injectButton.disabled = false;
    injectButton.textContent = "Analyze Page";
  }
});

// Handle Enter key press in query input
queryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const query = queryInput.value.trim();
    if (query) {
      queryInput.value = "";
      sendToFaultMaven(query);
    } else {
        displayErrorMessage("Please enter a query.");
    }
  }
});

// Handle data submission
submitDataBtn.addEventListener("click", async () => {
  const selectedSource = document.querySelector('input[name="data-source"]:checked').value;
  let data = "";

  switch (selectedSource) {
    case DATA_SOURCE_TEXT:
      data = dataInput.value.trim();
      break;
    case DATA_SOURCE_FILE:
      data = dataInput.value.trim(); // File content is already in the textarea
      break;
    case DATA_SOURCE_PAGE:
      if (!pageContent) {
        displayErrorMessage("No page content available. Please use 'Analyze Page' button.");
        return;
      }
      data = pageContent; // Use the page content stored from the injection
      break;
    default:
        displayErrorMessage("Unexpected data source.");
        return;
  }

  if (data) {
    await sendDataToFaultMaven(data, selectedSource);
    dataInput.value = ""; // Clear data input after submission
    pageContent = null; // Clear stored page content after submission
  } else {
      displayErrorMessage("Please provide data before submitting.");
  }
});

// Handle new conversation button click
newConversationButton.title = "⚠️ Starting a new conversation will reset the current session.";
newConversationButton.addEventListener("click", () => {
  sessionId = null; // Clear the session ID
  conversationHistory.innerHTML = ""; // Clear the conversation history
  queryInput.value = "";
  dataInput.value = "";
  pageContent = null; // Clear stored page content
});

// --- Initialization ---
resizeElements();

// Set up ResizeObserver to handle window resizing
const resizeObserver = new ResizeObserver(() => {
  resizeElements();
});

// Observe the sidebar container for resizing
resizeObserver.observe(sidebarContainer);