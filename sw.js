// The Poker Guide - service worker
// IMPORTANT: bump VERSION on every deploy. It clears the old cache automatically.
const VERSION = 'v16-2026-08-15-copy-guard';
const CACHE_NAME = 'poker-guide-' + VERSION;

// Relative paths: on GitHub Pages the app lives under /Poker_guide/, not at /
const ASSETS = [
  './',
  './index.html',
  './chapters.json',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Files that must always be fresh while the user is online
const FRESH = ['index.html', 'chapters.json', 'manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // allSettled instead of addAll: one missing file no longer aborts the install
      Promise.allSettled(ASSETS.map((a) => cache.add(new Request(a, { cache: 'reload' }))))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Google Fonts and the AI coach API are on other origins: leave them to the browser
  if (url.origin !== self.location.origin) return;

  const isFresh = req.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    FRESH.some((f) => url.pathname.endsWith(f));

  // Network-first for app content: new chapters and prices show up right away,
  // the cache is only the offline fallback.
  if (isFresh) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for immutable assets (icons, images)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      });
    })
  );
});
