// src/utils/helpers.js

/**
 * Logs a message with a timestamp and optional context.
 * @param {string} message - The message to log.
 * @param {string} [context] - Additional context for the log (e.g., the script name).
 */
export function log(message, context) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${context ? `[${context}] ` : ''}${message}`;
  console.log(logMessage);
}

/**
 * Fetches data from an API and returns the parsed JSON response.
 * @param {string} url - The API endpoint to fetch data from.
 * @param {Object} [options] - Optional fetch options (e.g., method, headers, body).
 * @returns {Promise<Object>} - The parsed JSON response.
 */
export async function fetchData(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    log(`Error fetching data from ${url}: ${error.message}`, "helpers.js");
    throw error;
  }
}

/**
 * Injects a content script into the specified tab.
 * @param {number} tabId - The ID of the tab to inject the script into.
 * @param {string} filePath - The path to the content script file.
 * @param {string} [url] - The URL of the tab (for logging purposes).
 */
export function injectContentScript(tabId, filePath, url) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: [filePath],
  }, () => {
    if (chrome.runtime.lastError) {
      log(`Error injecting content script: ${chrome.runtime.lastError.message}`, "helpers.js");
    } else {
      log(`Content script successfully injected into: ${url || tabId}`, "helpers.js");
    }
  });
}

/**
 * Sends a message to a content script in the specified tab.
 * @param {number} tabId - The ID of the tab to send the message to.
 * @param {Object} message - The message to send.
 * @returns {Promise<Object>} - The response from the content script.
 */
export async function sendMessageToContentScript(tabId, message) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    log(`Message sent to content script in tab ${tabId}: ${JSON.stringify(message)}`, "helpers.js");
    return response;
  } catch (error) {
    log(`Error sending message to content script: ${error.message}`, "helpers.js");
    throw error;
  }
}

/**
 * Checks if a URL is valid and starts with "http" or "https".
 * @param {string} url - The URL to validate.
 * @returns {boolean} - True if the URL is valid, false otherwise.
 */
export function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol.startsWith("http");
  } catch (error) {
    return false;
  }
}

/**
 * Debounces a function to limit how often it can be called.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

