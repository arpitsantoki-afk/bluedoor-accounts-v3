// BlueDoor Accounts V3 — Service Worker
const CACHE = 'bluedoor-v3-3';
const STATIC = [
  '/bluedoor-accounts-v3/index.html',
  '/bluedoor-accounts-v3/assets/logo-white.png',
  '/bluedoor-accounts-v3/assets/logo-black.png',
  '/bluedoor-accounts-v3/icons/icon-192x192.png',
  '/bluedoor-accounts-v3/icons/icon-512x512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept API calls or cross-origin requests
  if (url.hostname.includes('workers.dev') ||
      url.hostname.includes('resend.com') ||
      url.hostname.includes('googleapis.com') ||
      url.origin !== self.location.origin) return;

  // HTML pages — always network first, no caching
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/bluedoor-accounts-v3/index.html'))
    );
    return;
  }

  // Images/icons — cache first, clone BEFORE returning
  if (url.pathname.match(/\.(png|jpg|jpeg|ico|svg|webp)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok && resp.status === 200) {
            const toCache = resp.clone(); // clone BEFORE returning
            caches.open(CACHE).then(c => c.put(e.request, toCache));
          }
          return resp;
        });
      })
    );
    return;
  }
});
