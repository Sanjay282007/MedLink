// sw.js — background notifications for MedLink
importScripts("https://www.gstatic.com/firebasejs/9.6.11/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.11/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBdlLwkadXDKE3k5WVxW6Ku2UkhlNnZLwo",
  authDomain: "medlink-3ffdd.firebaseapp.com",
  projectId: "medlink-3ffdd",
  storageBucket: "medlink-3ffdd.firebasestorage.app",
  messagingSenderId: "1083121116797",
  appId: "1:1083121116797:web:15fafaf8d79c3448807314",
  measurementId: "G-QJD6XMY0VJ"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("📩 [MedLink SW] Background message received:", payload);
  const notificationTitle = payload.notification?.title || "💊 MedLink Reminder";
  const notificationBody = payload.notification?.body || "Time to take your medicine!";
  const notificationIcon = "logo.png";
  self.registration.showNotification(notificationTitle, {
    body: notificationBody,
    icon: notificationIcon,
    badge: notificationIcon,
    vibrate: [200, 100, 200],
    data: { url: "https://medlink-notify.netlify.app/" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("medlink-notify.netlify.app") && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow("https://medlink-notify.netlify.app/");
    })
  );
});
