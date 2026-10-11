// ============================================================
// Nexom Service Worker - PWA + Notifications
// ============================================================

const CACHE_NAME = 'nexom-v1';
const CACHE_URLS = [
  './',
  './index.html',
  './chat.html',
  './manifest.json',
  './icon.svg',
  'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css'
];

// ============================================================
// نصب Service Worker
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(CACHE_URLS).catch(err => {
          console.warn('[SW] Some files failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// فعال‌سازی
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================================
// رهگیری درخواست‌ها
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // درخواست‌های Supabase و LiveKit رو کش نکن
  if (url.hostname.includes('supabase.co') || url.hostname.includes('livekit')) {
    return;
  }

  // فقط درخواست‌های GET رو کش کن
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // اگه تو کش بود، برگردون + در پس‌زمینه آپدیت کن
      if (cached) {
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response.clone());
              });
            }
          })
          .catch(() => {});
        return cached;
      }

      // اگه تو کش نبود، از شبکه بگیر و کش کن
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // اگه آفلاین بودی و صفحه اصلی بود، index.html رو نشون بده
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// ============================================================
// اعلان‌ها - کلیک روی اعلان
// ============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('chat.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./chat.html');
      }
    })
  );
});

// ============================================================
// پیام از صفحه اصلی
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag } = event.data;
    self.registration.showNotification(title, {
      body: body,
      icon: icon || './icon.svg',
      badge: './icon.svg',
      dir: 'rtl',
      lang: 'fa',
      tag: tag || 'nexom-notif',
      renotify: true,
      vibrate: [200, 100, 200],
      requireInteraction: false
    });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================================
// Push Notification (برای آینده - Web Push واقعی)
// ============================================================
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'نکسوم';
  const options = {
    body: data.body || 'پیام جدید داری',
    icon: data.icon || './icon.svg',
    badge: './icon.svg',
    dir: 'rtl',
    lang: 'fa',
    vibrate: [200, 100, 200],
    data: data.url || './chat.html'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});