/**
 * Injected into Google SERP inside ChromeX browser (same logic as extension).
 */
(function () {
  if (window.__SSF_LOADED__) return;
  window.__SSF_LOADED__ = true;

  const API_BASE = "http://127.0.0.1:8765";
  const API_CHECK = `${API_BASE}/check`;
  const API_HEALTH = `${API_BASE}/health`;
  const PROCESSED_ATTR = "data-ssf-processed";
  const PLACEHOLDER_CLASS = "ssf-blocked-placeholder";
  const PLACEHOLDER_TEXT = "[Заблокировано по семантическому фильтру]";

  const SEARCH_ROOT_SELECTORS = ["div#search", "div#rso", "div[data-sokoban-container]", "div#main"];
  const SNIPPET_SELECTORS = [
    "div.VwiC3b",
    "div[data-content-feature]",
    "span.st",
    ".lEBKkf",
    ".MUxGbd",
    ".IsZvec",
    ".aCOpRe",
  ];

  let filterEnabled = true;
  let serverOnline = false;
  let observer = null;
  let scanScheduled = false;
  let lastUrl = location.href;

  const style = document.createElement("style");
  style.textContent = `
    #ssf-toggle-btn{margin-left:8px;padding:4px 10px;font-size:13px;border:1px solid #dadce0;border-radius:4px;background:#f8f9fa;cursor:pointer;font-family:inherit}
    #ssf-toggle-btn.ssf-off{background:#fce8e6;border-color:#f28b82;color:#c5221f}
    #ssf-toggle-btn.ssf-error{background:#fef7e0;border-color:#f9ab00;color:#b06000}
    .ssf-blocked-placeholder{padding:12px 16px;margin:8px 0;border-left:3px solid #dadce0;color:#5f6368;font-size:14px;font-style:italic;background:#f8f9fa}
  `;
  document.head.appendChild(style);

  function isSearchPage() {
    return /\/search/.test(location.pathname) || new URLSearchParams(location.search).has("q") || document.querySelector("div#search, div#rso");
  }

  function getSearchRoot() {
    for (const sel of SEARCH_ROOT_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function findResultContainer(h3) {
    const direct = h3.closest("div.g, div.MjjYud");
    if (direct) return direct;
    let el = h3.parentElement;
    for (let d = 0; el && d < 14; d++) {
      const link = el.querySelector?.('a[href^="http"]');
      if (link && el.contains(h3) && (el.getAttribute("data-hveid") || el.classList.contains("MjjYud"))) return el;
      el = el.parentElement;
    }
    return h3.closest("[data-hveid]") || h3.parentElement;
  }

  function findResultNodes(root) {
    const seen = new Set();
    const results = [];
    root.querySelectorAll("h3").forEach((h3) => {
      const node = findResultContainer(h3);
      if (!node || seen.has(node) || !node.querySelector('a[href^="http"]')) return;
      seen.add(node);
      results.push(node);
    });
    return results;
  }

  function extractText(node) {
    const title = node.querySelector("h3")?.innerText.trim() || "";
    let snippet = "";
    for (const sel of SNIPPET_SELECTORS) {
      const sn = node.querySelector(sel);
      if (sn && (snippet = sn.innerText.trim()).length > 10) break;
    }
    if (!title && !snippet) return "";
    return snippet ? (title ? `${title}. ${snippet}` : snippet) : title;
  }

  async function pingServer() {
    try {
      const res = await fetch(API_HEALTH, { cache: "no-store" });
      serverOnline = res.ok;
    } catch {
      serverOnline = false;
    }
    updateToggle();
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
    const parent = node.parentElement;
    if (!parent) return;
    if (node.nextElementSibling?.classList.contains(PLACEHOLDER_CLASS)) return;
    const ph = document.createElement("div");
    ph.className = PLACEHOLDER_CLASS;
    ph.textContent = PLACEHOLDER_TEXT;
    parent.insertBefore(ph, node.nextSibling);
  }

  async function processResult(node) {
    if (node.getAttribute(PROCESSED_ATTR) || !filterEnabled) return;
    node.setAttribute(PROCESSED_ATTR, "1");
    const text = extractText(node);
    if (!text || text.length < 3) return;
    try {
      const { block } = await checkText(text);
      if (block) hideResult(node);
    } catch {
      serverOnline = false;
      updateToggle();
      node.removeAttribute(PROCESSED_ATTR);
    }
  }

  function scanResults() {
    if (!filterEnabled || !isSearchPage()) return;
    const root = getSearchRoot();
    if (!root) return;
    findResultNodes(root).forEach((n) => processResult(n));
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      scanResults();
    });
  }

  function updateToggle() {
    const btn = document.getElementById("ssf-toggle-btn");
    if (!btn) return;
    if (!serverOnline) {
      btn.textContent = "Фильтр: нет сервера";
      btn.className = "ssf-error";
      return;
    }
    btn.className = filterEnabled ? "" : "ssf-off";
    btn.textContent = filterEnabled ? "Фильтр: ВКЛ" : "Фильтр: ВЫКЛ";
  }

  function injectToggle() {
    if (document.getElementById("ssf-toggle-btn")) return;
    const anchor =
      document.querySelector("#hdtb-msb") ||
      document.querySelector("div#hdtb") ||
      document.body;
    const btn = document.createElement("button");
    btn.id = "ssf-toggle-btn";
    btn.type = "button";
    btn.addEventListener("click", async () => {
      if (!serverOnline) {
        await pingServer();
        if (!serverOnline) return;
      }
      filterEnabled = !filterEnabled;
      await fetch(`${API_BASE}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter_enabled: filterEnabled }),
      });
      updateToggle();
      if (filterEnabled) {
        document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach((el) => el.removeAttribute(PROCESSED_ATTR));
        document.querySelectorAll(`.${PLACEHOLDER_CLASS}`).forEach((el) => el.remove());
        scheduleScan();
      }
    });
    anchor.appendChild(btn);
    updateToggle();
  }

  function injectSettingsBtn() {
    if (!window.pywebview?.api?.open_settings) return;
    if (document.getElementById("ssf-settings-btn")) return;
    const btn = document.createElement("button");
    btn.id = "ssf-settings-btn";
    btn.textContent = "⚙";
    btn.title = "Настройки ChromeX";
    btn.style.cssText =
      "margin-left:6px;padding:2px 8px;cursor:pointer;border:1px solid #dadce0;border-radius:4px;background:#fff";
    btn.onclick = () => window.pywebview.api.open_settings();
    const anchor = document.getElementById("ssf-toggle-btn")?.parentElement || document.querySelector("#hdtb-msb") || document.body;
    anchor.appendChild(btn);
  }

  async function boot() {
    if (!isSearchPage()) return;
    await pingServer();
    injectToggle();
    injectSettingsBtn();
    const root = getSearchRoot();
    if (root) {
      observer = new MutationObserver(() => scheduleScan());
      observer.observe(root, { childList: true, subtree: true });
    }
    scheduleScan();
    setInterval(pingServer, 15000);
  }

  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (isSearchPage()) scheduleScan();
    }
  }, 500);

  boot();
})();
