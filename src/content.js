console.log("Content script running");

// Function to create and inject the sidebar
function createSidebar() {
  const sidebar = document.createElement('div');
  sidebar.id = 'faultmaven-sidebar';
  sidebar.style.position = 'fixed';
  sidebar.style.right = '0';
  sidebar.style.top = '0';
  sidebar.style.width = '300px';
  sidebar.style.height = '100vh';
  sidebar.style.backgroundColor = '#fff';
  sidebar.style.borderLeft = '1px solid #ccc';
  sidebar.style.boxShadow = '-2px 0 5px rgba(0,0,0,0.1)';
  sidebar.style.zIndex = '10000';
  sidebar.style.overflow = 'auto';

  // ✅ Add default content inside the sidebar
  sidebar.innerHTML = `
    <div style="padding: 10px; font-family: Arial, sans-serif;">
      <h3 style="margin: 0; padding-bottom: 10px; border-bottom: 1px solid #ddd;">FaultMaven Sidebar</h3>
      <p>Ready to assist with troubleshooting!</p>
    </div>
  `;

  document.body.appendChild(sidebar);
}

// Listener for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content.js:", message);

  if (message.action === 'toggleSidebar') {
    const sidebar = document.getElementById('faultmaven-sidebar');
    if (sidebar) {
      sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
    } else {
      createSidebar();
    }
    sendResponse({ status: "Sidebar toggled" });
  }
});

