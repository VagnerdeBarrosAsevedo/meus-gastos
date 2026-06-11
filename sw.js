const CACHE_NAME = 'finanai-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon.png',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/dashboard.css',
  './css/transactions.css',
  './css/investments.css',
  './js/storage.js',
  './js/app.js',
  './js/dashboard.js',
  './js/transactions.js',
  './js/accounts.js',
  './js/investments.js',
  './js/goals.js',
  './js/budget.js',
  './js/ai-assistant.js',
  './js/reports.js'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => {
        // Fallback for offline if request fails
      });
    })
  );
});
