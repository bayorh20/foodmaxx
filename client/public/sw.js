const CACHE_NAME = 'foodmaxx-pwa-v30-live';
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
// WEB PUSH & BACKGROUND NOTIFICATION HANDLERS (WORKS EVEN WHEN APP IS CLOSED)
// Touching notification forces app to open and focus immediately.
// No website links are shown to the user.
// ============================================================
self.addEventListener('push', (event) => {
  const promise = (async () => {
    let data = {
      title: 'FoodMaxx Kitchen Update 🔔',
      body: 'You have a new update on your FoodMaxx order.',
      icon: '/foodmaxx-logo.png',
      badge: '/favicon.svg',
      url: '/'
    };

    let hasData = false;

    if (event.data) {
      try {
        const payload = event.data.json();
        // Support FCM structure { notification: {}, data: {} } and flat Web Push structure
        const notif = payload.notification || {};
        const extra = payload.data || {};

        data.title = notif.title || extra.title || payload.title || data.title;
        data.body = notif.body || extra.body || payload.body || payload.message || data.body;
        data.icon = notif.icon || extra.icon || payload.icon || '/foodmaxx-logo.png';
        data.image = notif.image || extra.image || extra.imageUrl || payload.image_url || undefined;
        data.url = extra.url || payload.url || notif.click_action || '/';
        data.tag = extra.tag || payload.tag || `fmx_${Date.now()}`;
        hasData = true;
      } catch (e) {
        try {
          const txt = event.data.text();
          if (txt) {
            data.body = txt;
            hasData = true;
          }
        } catch {}
      }
    }

    // If push arrived with empty payload (tickle push), fetch latest notification from Firestore REST API
    if (!hasData) {
      try {
        const res = await fetch('https://firestore.googleapis.com/v1/projects/foodmaxxapp/databases/(default)/documents/notification_logs?pageSize=1');
        if (res.ok) {
          const json = await res.json();
          const doc = json.documents?.[0];
          if (doc && doc.fields) {
            const fields = doc.fields;
            data.title = fields.title?.stringValue || data.title;
            data.body = fields.message?.stringValue || data.body;
            data.url = fields.url?.stringValue || '/';
            if (fields.image_url?.stringValue && fields.image_url.stringValue !== '/foodmaxx-logo.png') {
              data.image = fields.image_url.stringValue;
            }
            data.tag = doc.name || `fmx_broadcast_${Date.now()}`;
          }
        }
      } catch (fetchErr) {
        console.warn('[SW Push] Firestore fallback fetch notice:', fetchErr);
      }
    }

    // Strip any raw website URLs from the visible body so links are never shown
    const cleanBody = String(data.body || '').replace(/https?:\/\/[^\s]+/gi, '').trim();

    const options = {
      body: cleanBody,
      icon: data.icon || '/foodmaxx-logo.png',
      badge: data.badge || '/favicon.svg',
      image: data.image || undefined,
      tag: data.tag || `fmx_order_${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 300],
      actions: [
        { action: 'open', title: 'Open FoodMaxx 🛵' },
        { action: 'close', title: 'Dismiss' }
      ],
      data: {
        url: data.url || '/',
        timestamp: Date.now()
      }
    };

    return self.registration.showNotification(data.title, options);
  })();

  event.waitUntil(promise);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

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
  // Notification dismissed by user
});

// Allow client scripts to command background notifications (e.g. 5-second lockscreen test)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(self.registration.showNotification(title || 'FoodMaxx Update', options || {}));
  }

  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, options, delayMs } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title || '🔔 FoodMaxx Alert', options || {});
    }, delayMs || 5000);
  }
});


