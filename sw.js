/* ===========================================================
   🔔 MedLink — Firebase Cloud Messaging Service Worker
   Project: medlink-3ffdd
   Author: Sanjay Theretipally
   =========================================================== */

// Import Firebase SDK scripts for background messaging
importScripts("https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging.js");

// Initialize Firebase inside the Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyBdlLwkadXDKE3k5WVxW6Ku2UkhlNnZLwo",
  authDomain: "medlink-3ffdd.firebaseapp.com",
  projectId: "medlink-3ffdd",
  storageBucket: "medlink-3ffdd.firebasestorage.app",
  messagingSenderId: "1083121116797",
  appId: "1:1083121116797:web:15fafaf8d79c3448807314",
  measurementId: "G-QJD6XMY0VJ"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

/* ===========================================================
   ✅ Handle Background Notifications
   Triggered when:
   - The browser/app is closed
   - A push message arrives via Firebase Cloud Messaging
   =========================================================== */
messaging.onBackgroundMessage((payload) => {
  console.log("📩 [MedLink SW] Background message received:", payload);

  // Extract notification data
  const notificationTitle = payload.notification?.title || "💊 MedLink Reminder";
  const notificationBody = payload.notification?.body || "Time to take your medicine!";
  const notificationIcon = "logo.png"; // Make sure logo.png is in the same public folder

  // Define options
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: notificationIcon,
    vibrate: [200, 100, 200],
    data: {
      url: "https://medlink-notify.netlify.app/", // Opens your web app when tapped
      time: new Date().toISOString()
    }
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

/* ===========================================================
   🖱️ Handle Notification Click
   Opens the MedLink web app when user taps on the notification
   =========================================================== */
self.addEventListener("notificationclick", function (event) {
  console.log("🖱️ [MedLink SW] Notification click event:", event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // If the app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes("medlink-notify.netlify.app") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new tab
      if (clients.openWindow) {
        return clients.openWindow("https://medlink-notify.netlify.app/");
      }
    })
  );
});

/* ===========================================================
   ⚙️ Installation + Activation Events
   Ensures latest version of the service worker is always used
   =========================================================== */
self.addEventListener("install", (event) => {
  console.log("🚀 [MedLink SW] Installing new service worker...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("✅ [MedLink SW] Activated and ready to receive push messages!");
  event.waitUntil(clients.claim());
});
