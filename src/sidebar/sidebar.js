document.addEventListener("DOMContentLoaded", () => {
  const sidebarContainer = document.getElementById("sidebar-container");
  const queryInput = document.getElementById("query-input");
  const dataInput = document.getElementById("data-input");
  const responseOutput = document.getElementById("response-output");
  const submitAllBtn = document.getElementById("submit-all");
  const loadingIndicator = document.getElementById("loading-indicator");

  // Function to resize elements dynamically
  function resizeElements() {
    const containerWidth = sidebarContainer.offsetWidth;
    const paddingOffset = 20; // Adjust for padding

    // Set widths dynamically
    queryInput.style.width = `${containerWidth - paddingOffset}px`;
    dataInput.style.width = `${containerWidth - paddingOffset}px`;
    responseOutput.style.width = `${containerWidth - paddingOffset}px`;
    submitAllBtn.style.width = `${containerWidth - paddingOffset}px`;
    loadingIndicator.style.width = `${containerWidth - paddingOffset}px`;
  }

  // Initial resize
  resizeElements();

  // Observe sidebar container for resizing
  const resizeObserver = new ResizeObserver(() => {
    resizeElements();
  });

  // Start observing the sidebar container
  resizeObserver.observe(sidebarContainer);

  // Handle form submission
  submitAllBtn.addEventListener("click", () => {
    const query = queryInput.value.trim();
    const data = dataInput.value.trim();

    if (query || data) {
      sendToFaultMaven(query, data);
    } else {
      responseOutput.innerText = "Please enter either a question or data before submitting.";
    }
  });

  // Function to send data to FaultMaven backend
  function sendToFaultMaven(query, data) {
    responseOutput.innerText = "";
    loadingIndicator.style.display = "block";

    const payload = {
      query: query || "",
      data: data || "",
    };

    fetch("http://127.0.0.1:8000/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((result) => {
        loadingIndicator.style.display = "none";
        responseOutput.innerText = result.message || "No response received.";
      })
      .catch((error) => {
        loadingIndicator.style.display = "none";
        console.error("Error communicating with FaultMaven backend:", error);
        responseOutput.innerText = `Error processing request: ${error.message}. Please try again.`;
      });
  }
});

