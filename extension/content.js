/**
 * Semantic filter for Google search results (Manifest V3 content script).
 */

const API_BASE = "http://127.0.0.1:8765";
const API_CHECK = `${API_BASE}/check`;
const API_HEALTH = `${API_BASE}/health`;
const STORAGE_KEY = "ssf_enabled";
const PROCESSED_ATTR = "data-ssf-processed";
const PLACEHOLDER_CLASS = "ssf-blocked-placeholder";
const PLACEHOLDER_TEXT = "[Заблокировано по семантическому фильтру]";

const SEARCH_ROOT_SELECTORS = [
  "div#search",
  "div#rso",
  "div[data-sokoban-container]",
  "div#main",
];

const SNIPPET_SELECTORS = [
  "div.VwiC3b",
  "div[data-content-feature]",
  "span.st",
  ".lEBKkf",
  ".MUxGbd",
  ".IsZvec",
  ".aCOpRe",
  ".VwiC3b span",
];

let filterEnabled = true;
let serverOnline = false;
let observer = null;
let toggleBtn = null;
let scanScheduled = false;
let lastUrl = location.href;

function isSearchPage() {
  const path = location.pathname;
  const q = new URLSearchParams(location.search);
  return (
    /\/search/.test(path) ||
    q.has("q") ||
    q.has("query") ||
    document.querySelector("div#search, div#rso") !== null
  );
}

function getSearchRoot() {
  for (const sel of SEARCH_ROOT_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

/** Find organic result card by h3 title (works with div.g and div.MjjYud layouts). */
function findResultContainer(h3) {
  const direct = h3.closest("div.g, div.MjjYud");
  if (direct) return direct;

  let el = h3.parentElement;
  for (let depth = 0; el && depth < 14; depth += 1) {
    const link = el.querySelector?.('a[href^="http"]');
    if (link && el.contains(h3)) {
      if (el.getAttribute("data-hveid") || el.classList.contains("MjjYud")) {
        return el;
      }
    }
    el = el.parentElement;
  }
  return h3.closest("[data-hveid]") || h3.parentElement;
}

function findResultNodes(root) {
  const seen = new Set();
  const results = [];

  root.querySelectorAll("h3").forEach((h3) => {
    const node = findResultContainer(h3);
    if (!node || seen.has(node)) return;
    if (!node.querySelector('a[href^="http"]')) return;
    seen.add(node);
    results.push(node);
  });

  return results;
}

function extractText(node) {
  const titleEl = node.querySelector("h3");
  const title = titleEl ? titleEl.innerText.trim() : "";

  let snippet = "";
  for (const sel of SNIPPET_SELECTORS) {
    const sn = node.querySelector(sel);
    if (sn) {
      snippet = sn.innerText.trim();
      if (snippet.length > 10) break;
    }
  }

  if (!title && !snippet) return "";
  if (!snippet) return title;
  if (!title) return snippet;
  return `${title}. ${snippet}`;
}

async function pingServer() {
  try {
    const res = await fetch(API_HEALTH, { method: "GET", cache: "no-store" });
    serverOnline = res.ok;
  } catch {
    serverOnline = false;
  }
  updateToggleButton();
  return serverOnline;
}

async function checkText(text) {
  const res = await fetch(API_CHECK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  serverOnline = true;
  return res.json();
}

function hideResult(node) {
  node.style.display = "none";
  node.setAttribute("data-ssf-hidden", "1");

  const parent = node.parentElement;
  if (!parent) return;

  const next = node.nextElementSibling;
  if (next && next.classList.contains(PLACEHOLDER_CLASS)) return;

  const placeholder = document.createElement("div");
  placeholder.className = PLACEHOLDER_CLASS;
  placeholder.textContent = PLACEHOLDER_TEXT;
  parent.insertBefore(placeholder, node.nextSibling);
}

async function processResult(node) {
  if (node.getAttribute(PROCESSED_ATTR)) return;
  node.setAttribute(PROCESSED_ATTR, "1");

  const text = extractText(node);
  if (!text || text.length < 3) return;

  try {
    const { block } = await checkText(text);
    if (block) hideResult(node);
  } catch (err) {
    console.warn("[SSF] check failed:", err.message);
    serverOnline = false;
    updateToggleButton();
    node.removeAttribute(PROCESSED_ATTR);
  }
}

function scanResults() {
  if (!filterEnabled || !isSearchPage()) return;

  const root = getSearchRoot();
  if (!root) return;

  const results = findResultNodes(root);
  if (results.length === 0) {
    console.debug("[SSF] no results found yet");
    return;
  }

  console.debug(`[SSF] checking ${results.length} result(s)`);
  for (const node of results) {
    processResult(node);
  }
}

function scheduleScan() {
  if (scanScheduled) return;
  scanScheduled = true;
  requestAnimationFrame(() => {
    scanScheduled = false;
    scanResults();
  });
}

function waitForSearchRoot(timeoutMs = 20000) {
  return new Promise((resolve) => {
    const existing = getSearchRoot();
    if (existing) {
      resolve(existing);
      return;
    }

    const deadline = Date.now() + timeoutMs;
    const poll = setInterval(() => {
      const root = getSearchRoot();
      if (root) {
        clearInterval(poll);
        resolve(root);
      } else if (Date.now() > deadline) {
        clearInterval(poll);
        resolve(null);
      }
    }, 250);
  });
}

function updateToggleButton() {
  if (!toggleBtn) return;

  if (!serverOnline) {
    toggleBtn.textContent = "Фильтр: нет сервера";
    toggleBtn.classList.add("ssf-off", "ssf-error");
    toggleBtn.title =
      "Сервер не отвечает. Запустите run_server.bat и обновите страницу.";
    return;
  }

  toggleBtn.classList.remove("ssf-error");

  if (filterEnabled) {
    toggleBtn.textContent = "Фильтр: ВКЛ";
    toggleBtn.classList.remove("ssf-off");
    toggleBtn.title = "Семантический фильтр включён. Нажмите, чтобы выключить.";
  } else {
    toggleBtn.textContent = "Фильтр: ВЫКЛ";
    toggleBtn.classList.add("ssf-off");
    toggleBtn.title = "Семантический фильтр выключён. Нажмите, чтобы включить.";
  }
}

function injectToggleButton() {
  if (document.getElementById("ssf-toggle-btn")) return;

  const anchorSelectors = [
    "#hdtb-msb",
    "div#hdtb",
    "header#gb",
    "div[role='navigation']",
  ];

  let anchor = null;
  for (const sel of anchorSelectors) {
    anchor = document.querySelector(sel);
    if (anchor) break;
  }

  toggleBtn = document.createElement("button");
  toggleBtn.id = "ssf-toggle-btn";
  toggleBtn.type = "button";
  updateToggleButton();

  toggleBtn.addEventListener("click", async () => {
    if (!serverOnline) {
      await pingServer();
      if (!serverOnline) return;
      scheduleScan();
      return;
    }

    filterEnabled = !filterEnabled;
    await chrome.storage.local.set({ [STORAGE_KEY]: filterEnabled });
    updateToggleButton();
    if (filterEnabled) {
      document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach((el) => {
        el.removeAttribute(PROCESSED_ATTR);
        if (el.getAttribute("data-ssf-hidden")) {
          el.style.display = "";
          el.removeAttribute("data-ssf-hidden");
        }
      });
      document.querySelectorAll(`.${PLACEHOLDER_CLASS}`).forEach((el) => el.remove());
      scheduleScan();
    }
  });

  if (anchor) {
    anchor.appendChild(toggleBtn);
  } else {
    toggleBtn.style.position = "fixed";
    toggleBtn.style.top = "12px";
    toggleBtn.style.right = "12px";
    toggleBtn.style.zIndex = "99999";
    document.body.appendChild(toggleBtn);
  }
}

function startObserver(root) {
  if (observer) observer.disconnect();

  observer = new MutationObserver((mutations) => {
    let relevant = false;
    for (const m of mutations) {
      if (m.addedNodes.length) {
        relevant = true;
        break;
      }
    }
    if (relevant) scheduleScan();
  });

  observer.observe(root, { childList: true, subtree: true });
}

function watchNavigation() {
  setInterval(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;

    if (!isSearchPage()) return;

    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach((el) => {
      el.removeAttribute(PROCESSED_ATTR);
    });
    injectToggleButton();
    scheduleScan();
  }, 500);
}

async function boot() {
  if (!isSearchPage()) return;

  const stored = await chrome.storage.local.get(STORAGE_KEY);
  filterEnabled = stored[STORAGE_KEY] !== false;

  injectToggleButton();
  await pingServer();

  const root = await waitForSearchRoot();
  if (!root) {
    console.warn("[SSF] search results container not found");
    return;
  }

  startObserver(root);
  scheduleScan();

  setInterval(pingServer, 15000);

  const headerObserver = new MutationObserver(() => {
    if (!document.getElementById("ssf-toggle-btn")) injectToggleButton();
  });
  headerObserver.observe(document.body, { childList: true, subtree: true });
}

watchNavigation();
boot();
