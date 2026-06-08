// BlueDoor Accounts V3 — Service Worker v5
// HTML/JS/CSS: always network, never cached
// Images/icons: cached for performance
const CACHE = 'bluedoor-v5';
const STATIC_CACHE = [
  '/bluedoor-accounts-v3/icons/icon-192x192.png',
  '/bluedoor-accounts-v3/icons/icon-512x512.png',
  '/bluedoor-accounts-v3/assets/logo-white.png',
  '/bluedoor-accounts-v3/assets/logo-black.png',
];

self.addEventListener('install', e => {
  self.skipWaiting(); // activate immediately
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC_CACHE).catch(()=>{})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    // Delete all old caches
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // HTML, JS, CSS, JSON → always network, never cache
  if (url.pathname.match(/\.(html|js|css|json)$/) ||
      e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).catch(() =>
        new Response('Offline', {status: 503})
      )
    );
    return;
  }

  // Images → cache first
  if (url.pathname.match(/\.(png|jpg|jpeg|ico|svg|webp)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }))
    );
  }
});
