document.addEventListener("DOMContentLoaded", () => {
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

  let sessionId = null; // Store session ID
  let pageContent = null; // Store page content after injection

  // Function to resize elements dynamically
    function resizeElements() {
        const containerWidth = sidebarContainer.offsetWidth;
        const containerHeight = sidebarContainer.offsetHeight;
        const paddingOffset = 20;

        const elements = [queryInput, dataInput, fileInput, injectButton, submitDataBtn, loadingIndicator, newConversationButton];
        elements.forEach(element => {
            if (element) {
                element.style.width = `${containerWidth - paddingOffset}px`;
            }
        });

        // Gather heights *before* setting conversationHistory height
        let totalOtherHeights = 0;
        if (queryInput) totalOtherHeights += queryInput.offsetHeight;
        if (dataInput) totalOtherHeights += dataInput.offsetHeight;
        if (fileInput) totalOtherHeights += fileInput.offsetHeight;
        if (injectButton) totalOtherHeights += injectButton.offsetHeight;
        if (submitDataBtn) totalOtherHeights += submitDataBtn.offsetHeight;
        if (newConversationButton) totalOtherHeights += newConversationButton.offsetHeight;

        totalOtherHeights += 40 + paddingOffset; //Margins and paddings

        if (conversationHistory) {
          conversationHistory.style.height = `${containerHeight - totalOtherHeights}px`;
        }

    }
  // Initial resize
  resizeElements();

  // Set up ResizeObserver to handle window resizing
  const resizeObserver = new ResizeObserver(() => {
    resizeElements();
  });

  // Observe the sidebar container for resizing
  resizeObserver.observe(sidebarContainer);

  // Handle data source selection
  dataSourceOptions.forEach(option => {
    option.addEventListener("change", () => {
      const selectedSource = option.value;

      // Show/hide elements based on selection
      dataInput.style.display = selectedSource === "text" ? "block" : "none";
      fileInput.style.display = selectedSource === "file" ? "block" : "none";
      injectButton.style.display = selectedSource === "page" ? "block" : "none";

      // Clear the status message when a different source is selected
      if (selectedSource !== "page") {
        injectionStatus.textContent = "";
        injectionStatus.className = "";
      }

      // Trigger resize on source change to adjust layout
      resizeElements();
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
        await reader.readAsText(file); // Use await here.
      } catch (error) {
        console.error("Error reading file:", error);
        injectionStatus.textContent = "⚠️ Error reading file.";
        injectionStatus.className = "error";
      }
    }
  });

    // Handle inject button click.
    injectButton.addEventListener("click", async () => {
    injectButton.disabled = true;
    injectButton.textContent = "Analyzing...";
    injectionStatus.textContent = "Analyzing page...";
    injectionStatus.className = "loading";

    try {
      // Send message to background script to inject content script
       chrome.runtime.sendMessage({ action: "injectContentScript" }); //fire and forget

      // Send message to background script to get Page content
      const response = await chrome.runtime.sendMessage({ action: "getPageContent" });

      if (response && response.status === "success") {
        injectionStatus.textContent = `✅ Page selected (${response.url})`;
        injectionStatus.className = "success";
        pageContent = response.data; // Store the page content for later submission
      } else {
        injectionStatus.textContent = `⚠️ ${response?.message || 'Unknown error'}`;
        injectionStatus.className = "error";
      }
    } catch (error) {
      console.error("Error injecting content script:", error);
      injectionStatus.textContent = "⚠️ Error analyzing page.";
      injectionStatus.className = "error";
    } finally {
      injectButton.disabled = false;
      injectButton.textContent = "Analyze Current Page";
    }
    });

  // Handle Enter key press in query input.  Send query ONLY.
  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const query = queryInput.value.trim();
      if (query) {
        sendToFaultMaven(query);
        queryInput.value = ""; // Clear query input
      } else {
        displayErrorMessage("Please enter a query.");
      }
    }
  });

  // Handle data submission (Submit Data button)
  submitDataBtn.addEventListener("click", async () => {
    const selectedSource = document.querySelector('input[name="data-source"]:checked').value;
    let data = "";

    switch (selectedSource) {
      case "text":
        data = dataInput.value.trim();
        break;
      case "file":
        data = dataInput.value.trim();  // File content is ALREADY in dataInput
        break;
      case "page":
        if (!pageContent) {
            displayErrorMessage("No page content available. Please use 'Analyze Page' button.");
          return;
        }
        data = pageContent;
        break;
      default:
        displayErrorMessage("Unexpected data source.");
        return;
    }

    if (data) {
      await sendDataToFaultMaven(data, selectedSource);  // AWAIT the data submission
      dataInput.value = ""; // Clear data input after submission
      pageContent = null; // Clear stored page content
    } else {
      displayErrorMessage("Please provide data before submitting.");
    }
  });

  // Handle new conversation button click
  newConversationButton.addEventListener("click", () => {
    sessionId = null; // Clear the session ID
    conversationHistory.innerHTML = ""; // Clear the conversation history
    queryInput.value = "";
    dataInput.value = "";
    pageContent = null; // Clear stored page content
      // Inform the background script to clear the session
    chrome.runtime.sendMessage({ action: "clearSession" }, (response) => {
        if(response.status === 'success'){
          console.log("start a new conversation")
        }
        else{
          console.error("failed to start a new conversation")
        }
    });
  });

// Function to send query to FaultMaven backend
async function sendToFaultMaven(query) {
  loadingIndicator.style.display = "block";
  const payload = { query: query };
  const headers = { "Content-Type": "application/json" };
  if (sessionId) {
    headers["X-Session-ID"] = sessionId;
  }

  try {
    const response = await fetch(`${config.apiUrl}/query`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    const newSessionId = response.headers.get("X-Session-ID");
    if (newSessionId) {
      sessionId = newSessionId;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    loadingIndicator.style.display = "none";
    console.log("✅ Full API Response:", result);

    if (result && result.type === "session_expired") {
      // Handle session expiration specifically
      displayErrorMessage(result.message); // Use the message from the server
      sessionId = null; // Clear the client-side session ID
      return; // IMPORTANT: Stop processing

    } else if (result && result.response) {
        addToConversationHistory(query, result.response);
        if (result.message) {
            addToConversationHistory("", result.message, true);
        }
        } else {
            displayErrorMessage("Unexpected response format.");
        }
    } catch (error) {
      loadingIndicator.style.display = "none";
      console.error("❌ Error communicating with FaultMaven backend:", error);
      displayErrorMessage(`Error processing request: ${error.message}. Please try again.`);
    }
  }

// Function to send data to FaultMaven backend
async function sendDataToFaultMaven(data, dataType) {
  loadingIndicator.style.display = "block";
  let payload;
  const headers = {};

  if (sessionId) {
    headers["X-Session-ID"] = sessionId;
  }
  if (dataType === "text") {
    headers["Content-Type"] = "application/json";
    payload = { text: data };
  } else if (dataType === "url") {
      headers["Content-Type"] = "application/json";
      payload = { url: data };
  }else if (dataType === 'file') {
      headers["Content-Type"] = "application/json";
      payload = { text: data }; // Send file content as text
  }

  try {
    const response = await fetch(`${config.apiUrl}/data`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    const newSessionId = response.headers.get("X-Session-ID");
    if (newSessionId) {
      sessionId = newSessionId;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    loadingIndicator.style.display = "none";
    console.log("Data upload response:", result); // Log the full response

    // Display the summary, and any additional message from the server
    if (result && result.summary) {
      addToConversationHistory("", `Data Upload Success: ${result.summary}`);
    }
    if (result.message){
        addToConversationHistory("", result.message, true);
    }
    if(result && !result.summary){
        displayErrorMessage("Data upload failed. No summary received.");
    }

  } catch (error) {
    loadingIndicator.style.display = "none";
    console.error("❌ Error uploading data to FaultMaven backend:", error);
    displayErrorMessage(`Error uploading data: ${error.message}. Please try again.`);
  }
}

  // Function to add a question and response to the conversation history
function addToConversationHistory(question, response, isError = false) {
    if (question) {
        const questionElement = document.createElement("div");
        questionElement.className = "conversation-item user-question";
        questionElement.innerHTML = `<p><strong>Question:</strong> ${escapeHtml(question)}</p>`;
        conversationHistory.appendChild(questionElement);
    }

    if (response) {
        const responseElement = document.createElement("div");
        responseElement.className = `conversation-item ${isError ? 'error-response' : 'faultmaven-response'}`;
        responseElement.innerHTML = response;
        conversationHistory.appendChild(responseElement);
    }

    // Scroll to the bottom of the conversation history
    conversationHistory.scrollTop = conversationHistory.scrollHeight;
}
    // Helper function for basic HTML escaping
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    // Function to display error message.
    function displayErrorMessage(message) {
      const errorElement = document.createElement("div");
      errorElement.className = "conversation-item error-response";
      errorElement.innerHTML = `<p><strong>Error:</strong> ${message}</p>`;
      conversationHistory.appendChild(errorElement);
      conversationHistory.scrollTop = conversationHistory.scrollHeight;
    }
});