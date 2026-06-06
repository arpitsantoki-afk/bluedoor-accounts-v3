// BlueDoor Accounts V3 — Service Worker
const CACHE = 'bluedoor-v3-1';
const STATIC = [
  '/bluedoor-accounts-v3/',
  '/bluedoor-accounts-v3/index.html',
  '/bluedoor-accounts-v3/admin.html',
  '/bluedoor-accounts-v3/supervisor.html',
  '/bluedoor-accounts-v3/assets/logo-white.png',
  '/bluedoor-accounts-v3/assets/logo-black.png',
  '/bluedoor-accounts-v3/icons/icon-192x192.png',
  '/bluedoor-accounts-v3/icons/icon-512x512.png',
];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first for API, cache first for static
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls — always network, never cache
  if (url.hostname.includes('workers.dev') || url.hostname.includes('googleapis')) {
    return; // let browser handle normally
  }

  // Static assets — cache first, fallback to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Cache successful GET responses for same-origin
        if (resp.ok && e.request.method === 'GET' && url.origin === self.location.origin) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (e.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/bluedoor-accounts-v3/index.html');
        }
      });
    })
  );
});
