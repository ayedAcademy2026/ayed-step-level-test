/* sw.js — basic offline cache for GitHub Pages
   cacheVersion: 202601300200
*/
const CACHE = 'ayed-leveltest-202601300200';
const CORE = [
  './',
  './index.html',
  './level-test.html',
  './results.html',
  './faq.html',
  './support.html',
  './privacy.html',
  './terms.html',
  './404.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './assets/styles.css?v=202601300200',
  './assets/site-data.js?v=202601300200',
  './assets/app.js?v=202601300200',
  './assets/notifications.js?v=202601300200',
  './assets/test.js?v=202601300200',
  './assets/results.js?v=202601300200',
  './assets/questions.json?v=202601300200'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== CACHE) ? caches.delete(k) : null)))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if(cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=> caches.match('./index.html'));
    })
  );
});
