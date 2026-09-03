// Service Worker — TRI-CORE QC PWA (offline shell)
// BUILD_ID i PRECACHE_BUILD popunjava scripts/generisi-sw-precache.mjs posle `vite build`.
// Bez toga (dev) ostaju podrazumevane vrednosti i keš se puni tek kroz fetch.
const BUILD_ID = "dev";
const PRECACHE_BUILD = [];

const CACHE = `tri-core-qc-${BUILD_ID}`;
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon-32.png",
  "/icon-192.png",
  "/icon-512.png",
  ...PRECACHE_BUILD,
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    // addAll je sve-ili-ništa; pojedinačni put sprečava da jedan 404 obori ceo precache.
    caches.open(CACHE).then((c) =>
      Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {}))),
    ),
  );
  // Ne skipWaiting odmah — čeka korisnika (baner) ili SKIP_WAITING poruku.
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const url = e.request.url;
  if (url.includes("supabase.co") || e.request.method !== "GET") return;

  const jeNavigacija = e.request.mode === "navigate"
    || (e.request.headers.get("accept") || "").includes("text/html");

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && (url.endsWith(".js") || url.endsWith(".css") || url.includes("/assets/"))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((hit) => {
          if (hit) return hit;
          // Samo navigacija sme da padne na index.html (inače pogrešan MIME za JS/CSS).
          if (jeNavigacija) return caches.match("/index.html");
          return Response.error();
        }),
      ),
  );
});

self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data?.json?.() || {};
  } catch {
    try {
      data = { body: e.data?.text?.() || "" };
    } catch {
      data = {};
    }
  }
  e.waitUntil(
    self.registration.showNotification(data.title || "SPC alarm", {
      body: data.body || "Proveri SPC kartu",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "spc",
      data,
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow("/"));
});
