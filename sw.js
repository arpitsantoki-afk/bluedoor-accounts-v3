// BlueDoor Accounts V3 — Service Worker
// HTML is NEVER cached — always fresh from network
// Only static assets (images, icons) are cached
const CACHE = 'bluedoor-v3-4';
const STATIC = [
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

  // Never intercept: API calls, cross-origin, non-GET
  if (e.request.method !== 'GET') return;
  if (url.hostname !== self.location.hostname) return;

  // HTML pages — ALWAYS network first, never cache
  if (e.request.headers.get('accept')?.includes('text/html') ||
      url.pathname.endsWith('.html') || url.pathname === '/bluedoor-accounts-v3/') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => caches.match('/bluedoor-accounts-v3/index.html'))
    );
    return;
  }

  // JS/CSS files — also network first (so fixes deploy immediately)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.json')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(() => new Response('', {status: 503})));
    return;
  }

  // Images/icons — cache first
  if (url.pathname.match(/\.(png|jpg|jpeg|ico|svg|webp)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        });
      })
    );
  }
});
