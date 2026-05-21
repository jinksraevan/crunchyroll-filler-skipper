importScripts("shared.js");

const fetchText = async (url) => {
  const response = await fetch(url, {
    method: "GET",
    credentials: "omit",
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AFL request failed: url=${url} status=${response.status} body=${body.slice(0, 500)}`);
  }

  return response.text();
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "CFS_FETCH_TEXT") {
    return false;
  }

  const url = String(message.url || "");
  if (!url.startsWith("https://www.animefillerlist.com/")) {
    sendResponse({ ok: false, error: `Blocked unsupported fetch URL: ${url}` });
    return false;
  }

  fetchText(url)
    .then((text) => sendResponse({ ok: true, text }))
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));

  return true;
});
