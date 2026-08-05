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
  clearSession();
  if (typeof notifPollInterval !== "undefined" && notifPollInterval) {
    clearInterval(notifPollInterval);
    notifPollInterval = null;
  }
  switchView("login");
  document.getElementById("form-login")?.reset();
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

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}
