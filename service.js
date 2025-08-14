// ======== Service Worker ========
const VERSION = 'pwa-shop-v2';
const PRECACHE = `${VERSION}-precache`;
const RUNTIME = `${VERSION}-runtime`;

// Precache essential files
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/offline.html',
  '/assets/fallback-image.png'
];

// ======== Install ========
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PRECACHE).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// ======== Activate ========
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== PRECACHE && key !== RUNTIME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ======== Fetch Handler ========
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Navigation requests (HTML pages) -> cache-first, network fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached =>
        fetch(request)
          .then(response => {
            caches.open(RUNTIME).then(cache => cache.put('/index.html', response.clone()));
            return response.clone();
          })
          .catch(() => cached || caches.match('/offline.html'))
      )
    );
    return;
  }

  // 2. Images -> cache-first, fallback to placeholder
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request)
        .then(resp => {
          caches.open(RUNTIME).then(cache => cache.put(request, resp.clone()));
          return resp;
        })
        .catch(() => caches.match('/assets/fallback-image.png'))
      )
    );
    return;
  }

  // 3. API requests -> network-first, fallback to cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
    event.respondWith(
      fetch(request)
        .then(resp => {
          caches.open(RUNTIME).then(cache => cache.put(request, resp.clone()));
          return resp.clone();
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 4. Other requests -> cache-first, then network
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});

// ======== Push Notifications ========
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'PWA Shop', body: 'New notification', url: '/' };
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url },
    vibrate: [100, 50, 100]
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ======== Notification Click ========
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        const client = windowClients.find(c => c.url === targetUrl && 'focus' in c);
        if (client) return client.focus();
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
