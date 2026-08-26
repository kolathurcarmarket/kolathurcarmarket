/**
 * Login view logic — wired up once by app.js.
 *
 * PIN entry uses a themed on-screen keypad instead of the device
 * keyboard — no typing needed. As soon as 4 digits are tapped, the
 * login is attempted automatically (no Sign-in button to press).
 * PINs are standardized to exactly 4 digits for this to work — an
 * existing dealer/admin with a longer PIN needs it reset to 4 digits.
 *
 * The username is remembered per-device after a successful login
 * (localStorage, not sessionStorage — survives closing the browser),
 * so returning dealers see a "Continue as X" card and only need to
 * tap their PIN. "Not you?" clears it and shows the username field.
 */

const LOGIN_PIN_LENGTH = 4;
const REMEMBERED_USERNAME_KEY = "scd_remembered_username";
let loginPin = "";
let loginPinVisible = false;
let loginBusy = false;

function wireLoginView() {
  const usernameInput = document.getElementById("login-username");
  usernameInput?.addEventListener("focus", () => scrollFieldIntoView(usernameInput));

  initRememberedUser();
  updatePinDots();

  document.getElementById("login-pin-toggle").addEventListener("click", () => {
    loginPinVisible = !loginPinVisible;
    document.getElementById("login-pin-toggle").textContent = loginPinVisible ? "Hide" : "Show";
    updatePinDots();
  });

  document.querySelectorAll("#login-keypad .keypad-btn[data-key]").forEach((btn) => {
    btn.addEventListener("click", () => handleKeypadPress(btn.dataset.key));
  });
}

/* -------------------- Remembered username (per device) -------------------- */
function initRememberedUser() {
  const usernameWrap = document.getElementById("username-field-wrap");
  const rememberedWrap = document.getElementById("remembered-user-wrap");
  if (!usernameWrap || !rememberedWrap) return;

  const remembered = localStorage.getItem(REMEMBERED_USERNAME_KEY);
  if (remembered) {
    document.getElementById("login-username").value = remembered;
    document.getElementById("remembered-user-name").textContent = remembered;
    document.getElementById("remembered-user-avatar").textContent = (remembered[0] || "?").toUpperCase();
    usernameWrap.style.display = "none";
    rememberedWrap.style.display = "";
  } else {
    usernameWrap.style.display = "";
    rememberedWrap.style.display = "none";
  }

  document.getElementById("switch-user-btn")?.addEventListener("click", () => {
    localStorage.removeItem(REMEMBERED_USERNAME_KEY);
    document.getElementById("login-username").value = "";
    usernameWrap.style.display = "";
    rememberedWrap.style.display = "none";
    document.getElementById("login-username").focus();
  });
}

/* -------------------- PIN keypad -------------------- */
function updatePinDots() {
  const dots = document.querySelectorAll("#login-pin-dots .pin-dot");
  dots.forEach((dot, i) => {
    const filled = i < loginPin.length;
    dot.classList.toggle("filled", filled);
    dot.textContent = loginPinVisible && filled ? loginPin[i] : "";
  });
}

function setLoginKeypadBusy(busy) {
  loginBusy = busy;
  document.getElementById("login-keypad").classList.toggle("keypad-busy", busy);
}

function resetLoginPin() {
  loginPin = "";
  updatePinDots();
}

function handleKeypadPress(key) {
  if (loginBusy) return;
  const errorEl = document.getElementById("login-error");

  if (key === "back") {
    loginPin = loginPin.slice(0, -1);
    errorEl.textContent = "";
    updatePinDots();
    return;
  }

  if (loginPin.length >= LOGIN_PIN_LENGTH) return;

  loginPin += key;
  updatePinDots();

  if (loginPin.length === LOGIN_PIN_LENGTH) {
    attemptLogin();
  }
}

async function attemptLogin() {
  const username = document.getElementById("login-username").value.trim();
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";

  if (!username) {
    errorEl.textContent = "Enter your username first.";
    resetLoginPin();
    return;
  }

  const pin = loginPin;
  setLoginKeypadBusy(true);

  // Try admin first.
  const adminRes = await window.db.rpc("admin_login", { p_username: username, p_pin: pin });
  if (adminRes.error) {
    console.error(adminRes.error);
    errorEl.textContent = friendlyError(adminRes.error);
    setLoginKeypadBusy(false);
    resetLoginPin();
    return;
  }
  if (adminRes.data && adminRes.data.length > 0) {
    localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
    const session = { role: "admin", id: adminRes.data[0].id, token: adminRes.data[0].token, username: adminRes.data[0].username };
    saveSession(session);
    toast("Welcome back, admin.", "success");
    switchView("admin");
    document.getElementById("admin-current-username").textContent = session.username;
    loadAdminData(session);
    return;
  }

  // Not an admin — try dealer.
  const dealerRes = await window.db.rpc("dealer_login", { p_username: username, p_pin: pin });
  if (dealerRes.error) {
    console.error(dealerRes.error);
    errorEl.textContent = friendlyError(dealerRes.error);
    setLoginKeypadBusy(false);
    resetLoginPin();
    return;
  }
  if (dealerRes.data && dealerRes.data.length > 0) {
    localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
    const d = dealerRes.data[0];
    const session = {
      role: "dealer",
      id: d.id,
      token: d.token,
      username: d.username,
      fullName: d.full_name,
      shopName: d.shop_name,
    };
    saveSession(session);
    toast(`Welcome, ${d.full_name || d.username}.`, "success");
    switchView("dealer");
    hydrateDealerHeader(session);
    loadDealerData(session);
    return;
  }

  // Matched neither.
  errorEl.textContent = "Incorrect username or PIN.";
  setLoginKeypadBusy(false);
  resetLoginPin();
}
