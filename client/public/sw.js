const CACHE_NAME = 'foodmaxx-pwa-v29-live';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/app-icon.svg',
  '/favicon.svg',
  '/foodmaxx-logo.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Ignore cross-origin, firestore, paystack, and APIs
  if (url.origin !== self.location.origin) return;

  const isNavigation = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) ||
    url.pathname === '/' || url.pathname.endsWith('.html');

  if (isNavigation) {
    // Network-First for navigation/HTML: guarantees latest version is loaded on every visit
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() =>
          // 1st fallback: exact request cached copy
          caches.match(event.request)
            .then((cached) => cached ||
              // 2nd fallback: root '/' shell
              caches.match('/')
            )
        )
    );
    return;
  }

  const isJsOrCss = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');

  // Stale-While-Revalidate for static assets with strict MIME protection
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Validate cached entry: never return HTML when a JS/CSS chunk was requested
      if (cachedResponse && isJsOrCss) {
        const ct = cachedResponse.headers.get('content-type') || '';
        if (ct.includes('text/html')) {
          // Corrupted entry: delete it from cache and bypass to network
          caches.open(CACHE_NAME).then((c) => c.delete(event.request));
          return fetch(event.request);
        }
      }

      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const ct = networkResponse.headers.get('content-type') || '';
            // CRITICAL: NEVER cache HTML responses for JS or CSS requests!
            if (isJsOrCss && ct.includes('text/html')) {
              return networkResponse;
            }
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// ============================================================
// WEB PUSH & BACKGROUND NOTIFICATION HANDLERS
// Touching notification forces app to open and focus immediately.
// No website links are shown to the user.
// ============================================================
self.addEventListener('push', (event) => {
  let data = {
    title: 'FoodMaxx Update',
    body: 'You have a new update on your FoodMaxx order.',
    icon: '/foodmaxx-logo.png',
    badge: '/favicon.svg',
    url: '/'
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  // Strip any raw website URLs from the visible body so links are never shown
  let cleanBody = String(data.body || '').replace(/https?:\/\/[^\s]+/gi, '').trim();

  const options = {
    body: cleanBody,
    icon: data.icon || '/foodmaxx-logo.png',
    badge: data.badge || '/favicon.svg',
    image: data.image || data.imageUrl || data.image_url || undefined,
    tag: data.tag || `fmx_order_${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const destPath = event.notification.data?.url || '/';
  const targetUrl = new URL(destPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. If an app window/tab is already open, focus it, bring to front, and navigate
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      // 2. If app is closed, force open the app directly to targetUrl
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Notification dismissed
});

