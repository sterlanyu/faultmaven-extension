document.addEventListener("DOMContentLoaded", () => {
  const sidebarContainer = document.getElementById("sidebar-container");
  const queryInput = document.getElementById("query-input");
  const dataInput = document.getElementById("data-input");
  const fileInput = document.getElementById("file-input");
  const injectButton = document.getElementById("inject-button");
  const responseOutput = document.getElementById("response-output");
  const submitAllBtn = document.getElementById("submit-all");
  const loadingIndicator = document.getElementById("loading-indicator");
  const injectionStatus = document.getElementById("injection-status");
  const dataSourceOptions = document.querySelectorAll('input[name="data-source"]');

  // Function to resize elements dynamically
  function resizeElements() {
    const containerWidth = sidebarContainer.offsetWidth;
    const paddingOffset = 20; // Adjust for padding
    const elements = [queryInput, dataInput, fileInput, responseOutput, submitAllBtn, loadingIndicator];

    // Use requestAnimationFrame to avoid ResizeObserver loop issues
    requestAnimationFrame(() => {
      elements.forEach(element => {
        if (element) {
          element.style.width = `${containerWidth - paddingOffset}px`;
        }
      });
    });
  }

  // Initial resize and listen for changes
  resizeElements();
  new ResizeObserver(resizeElements).observe(sidebarContainer);

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
    });
  });

  // Handle file upload
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        dataInput.value = e.target.result; // Populate the textarea with file content
      };
      reader.readAsText(file);
    }
  });

  // Handle inject button click
  injectButton.addEventListener("click", () => {
    injectButton.disabled = true;
    injectButton.textContent = "Analyzing...";
    injectionStatus.textContent = "Analyzing page...";
    injectionStatus.className = "loading";

    chrome.runtime.sendMessage({ action: "injectContentScript" }, (response) => {
      injectButton.disabled = false;
      injectButton.textContent = "Analyze Page";
      if (response && response.status === "success") {
        injectionStatus.textContent = `✅ Page selected (${response.url})`; // Added URL back
        injectionStatus.className = "success";
      } else {
        injectionStatus.textContent = `⚠️ ${response.message}`;
        injectionStatus.className = "error";
      }
    });
  });

  // Handle form submission
  submitAllBtn.addEventListener("click", () => {
    const query = queryInput.value.trim();
    const selectedSource = document.querySelector('input[name="data-source"]:checked').value;
    let data = "";

    // Get data based on the selected source
    switch (selectedSource) {
      case "text":
        data = dataInput.value.trim();
        break;
      case "file":
        data = dataInput.value.trim(); // File content is already in the textarea
        break;
      case "page":
        // Data will be extracted by the content script
        data = "Page content analysis pending...";
        break;
    }

    if (query || data) {
      sendToFaultMaven(query, data);
    } else {
      responseOutput.innerHTML = "<p style='color: red;'>⚠️ Please enter a query or provide data before submitting.</p>";
    }
  });

  // Handle Enter key press in query input
  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent newline in textarea
      const query = queryInput.value.trim();
      if (query) {
        sendToFaultMaven(query, "");
      } else {
        responseOutput.innerHTML = "<p style='color: red;'>⚠️ Please enter a question.</p>";
      }
    }
  });

  // Function to send data to FaultMaven backend
  function sendToFaultMaven(query, data) {
    responseOutput.innerHTML = "";
    loadingIndicator.style.display = "block";

    const payload = {
      query: query || "",
      logs: data || "",
    };

    fetch("http://127.0.0.1:8000/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((result) => {
        loadingIndicator.style.display = "none";
        console.log("✅ Full API Response:", result);

        if (!result) {
          responseOutput.innerHTML = "<p style='color: red;'>⚠️ Unexpected response format.</p>";
          return;
        }

        let outputHTML = "";

        if (result.type === "query-only") {
          outputHTML = `<p><strong>Response:</strong> ${result.response}</p>`;
        } else if (result.type === "data-only") {
          // Handle data-only response (result.data is the log analysis)
          if (result.data && typeof result.data === "object") {
            Object.entries(result.data).forEach(([key, value]) => {
              if (key === "diagnostic_findings") {
                // Handle diagnostic_findings as a special case
                if (typeof value === "string") {
                  outputHTML += `<p><strong>Diagnostic Findings:</strong> ${value}</p>`;
                } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && "generated_text" in value[0]) {
                  outputHTML += `<p><strong>Diagnostic Findings:</strong> ${value[0].generated_text}</p>`;
                } else {
                  outputHTML += `<p><strong>Diagnostic Findings:</strong> No findings available.</p>`;
                }
              } else if (typeof value === "string" && value.trim()) {
                outputHTML += `<p><strong>${formatKeyTitle(key)}:</strong> ${value}</p>`;
              } else if (typeof value === "object") {
                // Handle nested objects (like categorized_logs, metrics)
                outputHTML += `<p><strong>${formatKeyTitle(key)}:</strong></p>`;
                outputHTML += "<ul>"; // Start an unordered list
                Object.entries(value).forEach(([subKey, subValue]) => {
                  outputHTML += `<li><strong>${formatKeyTitle(subKey)}:</strong> ${subValue}</li>`;
                });
                outputHTML += "</ul>"; // End the unordered list
              }
            });
          } else {
            outputHTML = "<p>⚠️ No log insights available.</p>";
          }
        } else if (result.type === "combined") {
          // Handle combined response, extracting JSON from Markdown
          try {
            let jsonString = result.data.query_response;
            console.log("Raw query_response:", jsonString); // ADD THIS LINE

            // Extract JSON from Markdown code block
            const match = jsonString.match(/`json\n([\s\S]*?)\n`/);
            if (match && match[1]) {
              jsonString = match[1];
            }
            console.log("jsonString after Markdown extraction:", jsonString); // ADD THIS LINE

            let parsedResponse;
            if (typeof jsonString === "string") {
              parsedResponse = JSON.parse(jsonString);
            } else {
              parsedResponse = jsonString; // In case it's already parsed
            }
            console.log("parsedResponse:", parsedResponse); // ADD THIS LINE

            outputHTML += `<p><strong>Answer:</strong> ${parsedResponse.answer}</p>`;
            if (parsedResponse.action_items && parsedResponse.action_items.length > 0) {
              outputHTML += `<p><strong>Action Items:</strong></p>`;
              outputHTML += "<ol>"; // Start an ordered list
              parsedResponse.action_items.forEach((step) => {
                outputHTML += `<li>${step}</li>`;
              });
              outputHTML += "</ol>";
            }
          } catch (error) {
            outputHTML = `<p style='color: red;'>⚠️ Error parsing the response from the LLM: ${error}</p>`;
          }
        } else if (result.type === "empty") {
          outputHTML = `<p>${result.response}</p>`;
        } else {
          outputHTML = "<p style='color: red;'>⚠️ Unexpected response format.</p>";
        }
        responseOutput.innerHTML = outputHTML;
      })
      .catch((error) => {
        loadingIndicator.style.display = "none";
        console.error("❌ Error communicating with FaultMaven backend:", error);
        responseOutput.innerHTML = `<p style='color: red;'>⚠️ Error processing request: ${error.message}. Please try again.</p>`;
      });
  }

  // ✅ Function to format response field titles
  function formatKeyTitle(key) {
    return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
});