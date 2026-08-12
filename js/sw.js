/**
 * DriveDesk service worker — caches the app shell (HTML/CSS/JS/icons)
 * so the installed app opens instantly and still works with a flaky
 * connection. Supabase API calls, fonts, and the CDN script are
 * cross-origin and always go straight to the network — this worker
 * never touches them.
 *
 * IMPORTANT: bump CACHE_NAME (e.g. "drivedesk-shell-v2") whenever you
 * want to force everyone's cached files to refresh after a deploy.
 */
const CACHE_NAME = "drivedesk-shell-v1";

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/config.js",
  "./js/supabaseClient.js",
  "./js/utils.js",
  "./js/auth.js",
  "./js/admin.js",
  "./js/dealer.js",
  "./js/accounts.js",
  "./js/app.js",
  "./assets/favicon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only same-origin GET requests are cached — everything else
  // (Supabase, Google Fonts, the Supabase JS CDN) passes straight through.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
