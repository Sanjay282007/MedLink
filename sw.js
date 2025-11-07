// sw.js  — background notifications
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => console.log('Service Worker active'));

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '💊 MedLink Reminder';
  const options = {
    body: data.body || 'Time to take your medicine!',
    icon: 'logo.png',
    badge: 'logo.png',
    vibrate: [200,100,200],
    data: { url: 'index.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url));
});
