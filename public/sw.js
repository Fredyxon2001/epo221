// Service worker básico para PWA instalable + caché ligero.
const VERSION = 'epo221-v1';
const PRECACHE = ['/', '/login', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: network-first para navegación/HTML, stale-while-revalidate para el resto.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // No cachear rutas dinámicas autenticadas ni llamadas a Supabase
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then((c) => c || caches.match('/')))
    );
    return;
  }

  if (url.origin === location.origin && /\.(png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req).then((res) => { cache.put(req, res.clone()); return res; }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
