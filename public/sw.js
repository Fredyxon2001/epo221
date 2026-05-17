// Service worker EPO 221: PWA + caché ligero + push notifications.
const VERSION = 'epo221-v2';
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

// Estrategia caché
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(req).then((c) => c || caches.match('/'))));
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

// ── Push notifications ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'EPO 221', body: 'Tienes una notificación nueva', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/img/icon-192.png',
      badge: '/img/icon-192.png',
      data: { url: data.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(url) && 'focus' in w) return w.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
