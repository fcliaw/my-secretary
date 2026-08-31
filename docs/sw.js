// My Secretary — Service Worker (Stage: PWA)
// Caches the static app shell so the app still opens (Login screen, or a
// cached Dashboard) with no signal. Live data (Google login, Sheet reads/
// writes) always needs a real network call — this never caches those.

const CACHE_NAME = "my-secretary-shell-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/config.js",
  "./js/auth.js",
  "./js/api.js",
  "./js/dashboard.js",
  "./js/importExport.js",
  "./js/settings.js",
  "./js/report.js",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle same-origin GET requests for the app shell — never
  // intercept calls to Apps Script or Google's own domains, which must
  // always hit the real network.
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline — fall back to cache
      return cached || network;
    })
  );
});
