/* Service Worker — Ayed STEP Level Test (v3.0.0-20260130) */
const CACHE_NAME = 'ayed-step-level-test-v3.0.0-20260130';
const CORE_ASSETS = [
  './',
  './index.html',
  './quiz.html',
  './results.html',
  './reviews.html',
  './review-status.html',
  './support.html',
  './faq.html',
  './404.html',
  './manifest.json',
  './pages/index.html',
  './pages/quiz.html',
  './pages/results.html',
  './pages/reviews.html',
  './pages/review-status.html',
  './pages/support.html',
  './pages/faq.html',
  './pages/404.html',
  './assets/styles.css',
  './assets/app.js',
  './assets/quiz.js',
  './assets/results.js',
  './assets/reviews.js',
  './assets/support.js',
  './assets/notifications.js',
  './assets/utils.js',
  './data/config.json',
  './data/questions.json',
  './data/notifications.json',
  './data/reviews.json',
  './data/success-stories.json',
  './data/name-pool.json',
  './assets/brand/app-icon-192.png',
  './assets/brand/app-icon-512.png',
  './assets/brand/favicon-32.png',
  './assets/brand/favicon-16.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(CORE_ASSETS);
    } catch (e) {
      // ignore (some assets may fail on first load)
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null));
    self.clients.claim();
  })());
});

// Cache-first for same-origin GET; network fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: false });
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      // Only cache successful responses
      if (fresh && fresh.status === 200) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (e) {
      // Offline fallback: try basic 404
      const fallback = await cache.match('./404.html');
      return fallback || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
