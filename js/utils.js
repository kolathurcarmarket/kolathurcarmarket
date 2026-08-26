/* ---------------------------------------------------------------
   Shared utilities used across login, admin and dealer screens
------------------------------------------------------------------ */

/**
 * Duplicate-click / double-submit protection.
 * Wrap any async handler with guardClick(button, fn). While fn is
 * in-flight the button is disabled, shows a spinner label, and any
 * extra clicks (mouse, touch, keyboard Enter-repeat) are ignored.
 */
function guardClick(button, handler) {
  return async function (...args) {
    if (button.dataset.busy === "1") return; // already running, ignore
    button.dataset.busy = "1";
    const originalHTML = button.innerHTML;
    const originalWidth = button.offsetWidth;
    button.style.minWidth = originalWidth + "px";
    button.disabled = true;
    button.classList.add("is-busy");
    button.innerHTML = '<span class="spinner" aria-hidden="true"></span>';
    try {
      await handler.apply(this, args);
    } finally {
      button.dataset.busy = "0";
      button.disabled = false;
      button.classList.remove("is-busy");
      button.innerHTML = originalHTML;
    }
  };
}

/**
 * Generic debounce, useful for search inputs / resize handlers.
 */
function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Lightweight toast notifications (success / error / info).
 */
function toast(message, type = "info", timeout = 3200) {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, timeout);
}

/* ---------------------------------------------------------------
   Session helpers (sessionStorage — cleared when the tab closes)
------------------------------------------------------------------ */
const SESSION_KEY = "scd_session"; // second-hand-car-dealer session

function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Guards a dashboard page: redirects to login if there is no valid
 * session, or if the session role doesn't match what's required.
 */
function requireRole(role) {
  const session = getSession();
  if (!session || session.role !== role) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

/**
 * View router for the single-page app (login / admin / dealer views
 * living in one index.html, toggled instead of navigated).
 */
function switchView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-" + name).classList.add("active");
}

function logout() {
  const session = getSession();
  if (session?.token && window.db) {
    const rpcName = session.role === "admin" ? "admin_logout" : "dealer_logout";
    window.db.rpc(rpcName, { p_token: session.token }).catch(() => {});
  }
  clearSession();
  if (typeof notifPollInterval !== "undefined" && notifPollInterval) {
    clearInterval(notifPollInterval);
    notifPollInterval = null;
  }
  switchView("login");
  document.getElementById("form-login")?.reset();
  if (typeof resetLoginPin === "function") resetLoginPin();
}

/* ---------------------------------------------------------------
   Small formatting helpers
------------------------------------------------------------------ */
function formatCurrency(n) {
  if (n === null || n === undefined || n === "") return "—";
  return Number(n).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function formatKm(n) {
  if (n === null || n === undefined || n === "") return "—";
  return Number(n).toLocaleString("en-IN") + " km";
}

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

/**
 * Turns a raw Supabase error into a specific, human-readable message
 * instead of a generic "something went wrong".
 */
function friendlyError(error) {
  if (!error) return "Something went wrong. Try again.";
  const msg = (error.message || "").toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed")) {
    return "Can't reach the database. Check your internet connection, or confirm the Supabase project is active and the URL/key in js/config.js match your dashboard.";
  }
  if (msg.includes("duplicate")) return "That username is already taken.";
  return error.message || "Something went wrong. Try again.";
}

/** Scrolls a freshly-focused field into view once the mobile keyboard
 *  finishes animating in, so the input never ends up hidden behind it. */
function scrollFieldIntoView(el) {
  setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
}

/** Real WhatsApp glyph (brand mark), sized via `size`, colored via currentColor. */
function whatsappIconSvg(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.004 0C7.164 0 0 7.163 0 16c0 2.82.738 5.566 2.14 7.982L0 32l8.207-2.104A15.93 15.93 0 0 0 16.004 32C24.84 32 32 24.837 32 16S24.84 0 16.004 0Zm0 29.27a13.23 13.23 0 0 1-6.75-1.85l-.484-.288-4.87 1.249 1.302-4.75-.316-.488A13.22 13.22 0 0 1 2.73 16c0-7.324 5.95-13.27 13.274-13.27S29.278 8.676 29.278 16 23.328 29.27 16.004 29.27Z"/>
    <path d="M23.11 19.13c-.39-.196-2.304-1.138-2.662-1.268-.357-.13-.617-.196-.877.196-.26.39-1.006 1.267-1.234 1.528-.227.26-.454.293-.844.098-.39-.196-1.646-.607-3.135-1.936-1.159-1.034-1.942-2.311-2.169-2.702-.227-.39-.024-.6.171-.795.176-.175.39-.454.585-.682.195-.227.26-.39.39-.65.13-.26.065-.487-.033-.682-.098-.196-.877-2.114-1.202-2.895-.316-.762-.638-.66-.877-.672-.227-.01-.487-.012-.747-.012-.26 0-.682.098-1.04.487-.357.39-1.364 1.333-1.364 3.25 0 1.918 1.396 3.771 1.591 4.031.195.26 2.75 4.2 6.664 5.888.931.402 1.658.642 2.225.822.935.298 1.786.256 2.459.155.75-.112 2.304-.942 2.629-1.852.325-.91.325-1.69.227-1.852-.097-.163-.357-.26-.747-.455Z"/>
  </svg>`;
}

/**
 * Themed replacement for the browser's native confirm() — opens the
 * shared #confirm-modal and resolves true/false based on the button
 * the person taps. Usage: `if (!(await showConfirm("..."))) return;`
 */
function showConfirm(message, opts = {}) {
  const { confirmLabel = "Continue", cancelLabel = "Cancel", danger = false } = opts;
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const body = document.getElementById("confirm-modal-body");
    body.innerHTML = `
      <p class="wizard-question" style="font-size:1.05rem;">${escapeHtml(message)}</p>
      <div class="wizard-nav" style="margin-top:1.2rem;">
        <button type="button" class="wizard-back" id="confirm-cancel-btn">${escapeHtml(cancelLabel)}</button>
        <button type="button" class="btn ${danger ? "btn--danger" : "btn--primary"}" id="confirm-ok-btn" style="flex:1;">${escapeHtml(confirmLabel)}</button>
      </div>
    `;
    modal.classList.add("open");

    const finish = (result) => {
      modal.classList.remove("open");
      resolve(result);
    };
    document.getElementById("confirm-cancel-btn").onclick = () => finish(false);
    document.getElementById("confirm-ok-btn").onclick = () => finish(true);
    modal.querySelectorAll("[data-close-modal]").forEach((el) => {
      el.onclick = () => finish(false);
    });
  });
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}
