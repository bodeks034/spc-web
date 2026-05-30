// ============================================================
// Service Worker za SPC PWA — offline support
// Kopiraj u public/ folder projekta
// ============================================================
const CACHE = "spc-v9";
const ASSETS = [
  "/", "/index.html", "/src/App.jsx",
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // API pozivi uvek online
  if (e.request.url.includes("supabase.co")) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// Push notifikacije
self.addEventListener("push", e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || "SPC Alarm", {
      body:  data.body  || "Proveri SPC kartu",
      icon:  "/icon-192.png",
      badge: "/icon-192.png",
      tag:   data.tag || "spc",
      data:  data,
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.openWindow("/"));
});
