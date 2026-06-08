// Simple Service Worker for PWA compliance - Network First Strategy
const CACHE_NAME = '3t-quiz-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo3t.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Permanently purge all old caches to force updates
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  
  // Skip cross-origin or non-GET requests, as well as analytics, API endpoints and Firebase connections
  if (
    e.request.method !== 'GET' ||
    url.includes('/api/') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('firebasejs') ||
    !url.startsWith(self.location.origin)
  ) {
    return; // Fallback to browsers standard behavior
  }

  // Network-First Strategy for maximum freshness
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If response is valid, update the cache safely
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is unavailable/offline
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If neither is available, return fallback if it is a page request
          if (e.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Network error occurred', { status: 404, statusText: 'Offline' });
        });
      })
  );
});

