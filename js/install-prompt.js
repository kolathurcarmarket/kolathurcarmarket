/**
 * Custom "Install App" banner.
 *
 * Chrome/Edge no longer show their own automatic install prompt —
 * this captures the `beforeinstallprompt` event (fires on Android
 * Chrome/Edge once the PWA meets install criteria) and shows our own
 * themed banner with a real "Install" button instead.
 *
 * iOS Safari has no install API at all (Apple doesn't allow a page to
 * trigger it) — for iPhone/iPad we show a short instruction banner
 * ("tap Share, then Add to Home Screen") instead of an Install button.
 *
 * Self-contained — no dependency on session state, so it's safe to
 * load on every page regardless of who's logged in.
 */
(function () {
  const DISMISS_KEY = "scd_install_dismissed_at";
  const DISMISS_DAYS = 7;

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function recentlyDismissed() {
    const at = localStorage.getItem(DISMISS_KEY);
    if (!at) return false;
    const days = (Date.now() - Number(at)) / 86400000;
    return days < DISMISS_DAYS;
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  function buildBanner(message, showInstallBtn, onInstall) {
    if (document.getElementById("install-banner")) return; // already showing

    const el = document.createElement("div");
    el.id = "install-banner";
    el.innerHTML = `
      <div class="install-banner__icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="13" width="19" height="6" rx="1.6" stroke="#F0A63A" stroke-width="1.6"/><path d="M3 13l1.6-4.8A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.2L21 13" stroke="#F0A63A" stroke-width="1.6" stroke-linecap="round"/></svg>
      </div>
      <div class="install-banner__text">${message}</div>
      <div class="install-banner__actions">
        ${showInstallBtn ? `<button type="button" class="btn btn--primary btn--sm" id="install-banner-btn">Install</button>` : ""}
        <button type="button" class="install-banner__close" id="install-banner-close" aria-label="Dismiss">&times;</button>
      </div>
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));

    const dismiss = () => {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      el.classList.remove("show");
      setTimeout(() => el.remove(), 250);
    };
    document.getElementById("install-banner-close").addEventListener("click", dismiss);

    if (showInstallBtn) {
      document.getElementById("install-banner-btn").addEventListener("click", async () => {
        await onInstall();
        el.classList.remove("show");
        setTimeout(() => el.remove(), 250);
      });
    }
  }

  if (isStandalone() || recentlyDismissed()) return;

  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    buildBanner("Install DriveDesk for quick, one-tap access.", true, async () => {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    });
  });

  window.addEventListener("appinstalled", () => {
    localStorage.removeItem(DISMISS_KEY);
    document.getElementById("install-banner")?.remove();
  });

  // iOS Safari never fires beforeinstallprompt — show instructions instead.
  if (isIos() && !isStandalone()) {
    setTimeout(() => {
      buildBanner('Install DriveDesk: tap Share, then "Add to Home Screen".', false, null);
    }, 1500);
  }
})();
