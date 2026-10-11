// Service Worker برای اعلان‌ها
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// وقتی اعلان کلیک شد
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

// پیام از صفحه اصلی
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag } = event.data;
    self.registration.showNotification(title, {
      body: body,
      icon: icon || './icon.png',
      badge: './icon.png',
      dir: 'rtl',
      lang: 'fa',
      tag: tag || 'nexom-notif',
      renotify: true,
      vibrate: [200, 100, 200],
      requireInteraction: false
    });
  }
});