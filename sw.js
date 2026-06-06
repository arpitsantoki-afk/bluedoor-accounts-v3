// BlueDoor Accounts V3 — Service Worker
const CACHE = 'bluedoor-v3-2';  // bump version to force cache clear
const STATIC = [
  '/bluedoor-accounts-v3/index.html',
  '/bluedoor-accounts-v3/assets/logo-white.png',
  '/bluedoor-accounts-v3/assets/logo-black.png',
  '/bluedoor-accounts-v3/icons/icon-192x192.png',
  '/bluedoor-accounts-v3/icons/icon-512x512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first for HTML — always get fresh app pages
// Cache first only for images/icons
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache API calls
  if (url.hostname.includes('workers.dev')) return;

  // HTML pages — network first, no cache
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/bluedoor-accounts-v3/index.html'))
    );
    return;
  }

  // Images/icons — cache first
  if (url.pathname.match(/\.(png|jpg|ico|svg)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
        if (resp.ok) caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        return resp;
      }))
    );
    return;
  }
});
