/**
 * DevTools Panel Controller Script
 */
(function () {
  let entries = [];
  let selectedId = null;
  let activeFilter = "all";
  let searchQuery = "";

  /**
   * JSON.stringify replacer that serializes BigInt values as decimal strings
   * instead of throwing. Soroban contract data may contain BigInt values.
   */
  function bigIntReplacer(_key, value) {
    return typeof value === "bigint" ? value.toString() : value;
  }

  /** Wrapper around JSON.stringify that never throws on BigInt values. */
  function safeStringify(value, indent) {
    return JSON.stringify(value, bigIntReplacer, indent);
  }

  const instancesContainer = document.getElementById("instances-container");
  const inspectorContainer = document.getElementById("inspector-container");
  const searchInput = document.getElementById("search-input");
  const clearBtn = document.getElementById("clear-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const activeCount = document.getElementById("active-count");

  // Connect port with background service worker if chrome.runtime is available
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.devtools) {
    const tabId = chrome.devtools.inspectedWindow.tabId;
    const port = chrome.runtime.connect({ name: "stellar-hooks-panel-" + tabId });

    port.onMessage.addListener(function (message) {
      if (message.type === "HOOK_ACTIVITY_UPDATE" && Array.isArray(message.payload)) {
        updateEntries(message.payload);
      }
    });

    // Query initial state
    fetchInspectedEntries();
  }

  function fetchInspectedEntries() {
    if (typeof chrome !== "undefined" && chrome.devtools) {
      chrome.devtools.inspectedWindow.eval(
        "window.__STELLAR_HOOKS_DEVTOOLS__ ? window.__STELLAR_HOOKS_DEVTOOLS__.getHookInstances() : []",
        function (result, isException) {
          if (!isException && Array.isArray(result)) {
            updateEntries(result);
          }
        }
      );
    }
  }

  function getStatusClass(status, hasError) {
    if (hasError) return "status-error";
    const s = (status || "").toLowerCase();
    if (s.includes("loading") || s.includes("pending") || s.includes("fetching")) return "status-loading";
    if (s.includes("success") || s.includes("connected") || s.includes("ready")) return "status-success";
    if (s.includes("error") || s.includes("failed")) return "status-error";
    return "status-idle";
  }

  function updateCounts() {
    activeCount.textContent = entries.length + " active";
    let counts = { all: entries.length, loading: 0, success: 0, error: 0, idle: 0 };

    for (const e of entries) {
      const s = (e.status || "").toLowerCase();
      if (e.lastError || s.includes("error") || s.includes("failed")) {
        counts.error++;
      } else if (s.includes("loading") || s.includes("pending") || s.includes("fetching")) {
        counts.loading++;
      } else if (s.includes("success") || s.includes("connected") || s.includes("ready")) {
        counts.success++;
      } else {
        counts.idle++;
      }
    }

    for (const [key, val] of Object.entries(counts)) {
      const el = document.getElementById("count-" + key);
      if (el) el.textContent = val;
    }
  }

  function filterEntries() {
    return entries.filter(function (entry) {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          entry.name.toLowerCase().includes(q) ||
          entry.id.toLowerCase().includes(q) ||
          (entry.lastError && entry.lastError.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (activeFilter === "all") return true;
      const s = (entry.status || "").toLowerCase();
      if (activeFilter === "error") return !!entry.lastError || s.includes("error") || s.includes("failed");
      if (activeFilter === "loading") return s.includes("loading") || s.includes("pending") || s.includes("fetching");
      if (activeFilter === "success") return s.includes("success") || s.includes("connected") || s.includes("ready");
      if (activeFilter === "idle") {
        return !entry.lastError && !s.includes("error") && !s.includes("loading") && !s.includes("success");
      }
      return true;
    });
  }

  function renderList() {
    updateCounts();
    const visible = filterEntries();

    if (visible.length === 0) {
      instancesContainer.innerHTML = '<div class="empty-state">No matching hook instances.</div>';
      renderInspector(null);
      return;
    }

    if (!selectedId || !visible.some((e) => e.id === selectedId)) {
      selectedId = visible[0].id;
    }

    instancesContainer.innerHTML = "";
    visible.forEach(function (entry) {
      const item = document.createElement("div");
      item.className = "instance-item" + (entry.id === selectedId ? " selected" : "");
      item.onclick = function () {
        selectedId = entry.id;
        renderList();
      };

      const titleRow = document.createElement("div");
      titleRow.className = "instance-title-row";

      const name = document.createElement("span");
      name.className = "instance-name";
      name.textContent = entry.name;

      const pill = document.createElement("span");
      pill.className = "status-pill " + getStatusClass(entry.status, !!entry.lastError);
      pill.textContent = entry.status;

      titleRow.appendChild(name);
      titleRow.appendChild(pill);

      const subRow = document.createElement("div");
      subRow.className = "instance-sub-row";
      subRow.innerHTML =
        "<span>" +
        escapeHtml(entry.id) +
        "</span><span>" +
        (entry.updatedAt ? new Date(entry.updatedAt).toLocaleTimeString() : "") +
        "</span>";

      item.appendChild(titleRow);
      item.appendChild(subRow);

      if (entry.lastError) {
        const errDiv = document.createElement("div");
        errDiv.className = "error-preview";
        errDiv.textContent = "⚠️ " + entry.lastError;
        item.appendChild(errDiv);
      }

      instancesContainer.appendChild(item);
    });

    const activeEntry = entries.find((e) => e.id === selectedId) || null;
    renderInspector(activeEntry);
  }

  function renderInspector(entry) {
    if (!entry) {
      inspectorContainer.innerHTML =
        '<div class="empty-state"><p>Select a hook instance from the left list to inspect its state.</p></div>';
      return;
    }

    let html =
      '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">' +
      '<div><h3 style="margin: 0 0 4px; font-size: 16px;">' +
      escapeHtml(entry.name) +
      "</h3>" +
      '<code style="font-size: 11px; color: #94a3b8;">' +
      escapeHtml(entry.id) +
      "</code></div>" +
      '<button class="btn" id="copy-btn">Copy JSON</button></div>';

    if (entry.lastError) {
      html +=
        '<div class="error-box"><strong style="display: block; margin-bottom: 4px; color: #f87171;">Last Error:</strong>' +
        escapeHtml(entry.lastError) +
        "</div>";
    }

    html +=
      '<div style="color: #94a3b8; font-size: 11px; margin-bottom: 8px;">// Instance Snapshot State</div>' +
      '<pre class="state-box">' +
      escapeHtml(safeStringify(entry, 2)) +
      "</pre>";

    inspectorContainer.innerHTML = html;

    const copyBtn = document.getElementById("copy-btn");
    if (copyBtn) {
      copyBtn.onclick = function () {
        navigator.clipboard.writeText(safeStringify(entry, 2)).catch(function () {});
        copyBtn.textContent = "Copied!";
        setTimeout(function () {
          copyBtn.textContent = "Copy JSON";
        }, 2000);
      };
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function updateEntries(newEntries) {
    entries = newEntries || [];
    renderList();
  }

  // Event Listeners
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      searchQuery = e.target.value;
      renderList();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      entries = [];
      selectedId = null;
      renderList();
      if (typeof chrome !== "undefined" && chrome.devtools) {
        chrome.devtools.inspectedWindow.eval(
          "window.__STELLAR_HOOKS_DEVTOOLS__ && window.__STELLAR_HOOKS_DEVTOOLS__.clear()"
        );
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", fetchInspectedEntries);
  }

  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.getAttribute("data-filter") || "all";
      renderList();
    });
  });

  // Global update method called from devtools.js
  window.__updateDevToolsPanel = updateEntries;
})();
