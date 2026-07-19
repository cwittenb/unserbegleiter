// Service Worker (M2) — App-Shell offline, Kern-Hash als Cache-Version.
// Wird von build-pages.js gebündelt (esbuild, iife) und mit dem echten
// Kern-Hash gestempelt: jeder Deploy bekommt einen NEUEN Cache-Namen, activate
// räumt alle alten Stände weg. Kein Workbox — der gesamte Lebenszyklus ist
// hier lesbar. Routing-Entscheidung: sw-routing.js (rein, getestet).

import { SHELL_PFADE, cacheEntscheidung } from "./sw-routing.js";

const CACHE = "rzz-shell-__CORE_HASH__";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL_PFADE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                       // niemals Mutationen anfassen
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // nur eigener Origin
  const modus = cacheEntscheidung(url.pathname);
  if (modus === "nie" || modus === "netz") return;        // Browser-Standard, kein Cache

  if (modus === "cache-zuerst") {
    e.respondWith(
      caches.match(req).then((tref) => tref || fetch(req).then((antwort) => {
        if (antwort.ok) { const kopie = antwort.clone(); caches.open(CACHE).then((c) => c.put(req, kopie)); }
        return antwort;
      }))
    );
    return;
  }

  // netz-zuerst: Einstieg "/" — frisch, solange Netz da ist; offline aus dem Cache.
  e.respondWith(
    fetch(req).then((antwort) => {
      if (antwort.ok) { const kopie = antwort.clone(); caches.open(CACHE).then((c) => c.put(req, kopie)); }
      return antwort;
    }).catch(() => caches.match(req).then((tref) => tref || caches.match("/")))
  );
});

/* ---- Web Push (M7a): Anzeige des inhaltsfreien Hinweises + Klick öffnet die App. */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* leere/fremde Nutzlast */ }
  if (!d.titel || !d.text) return;                     // nur unser eigenes Format anzeigen
  e.waitUntil(self.registration.showNotification(d.titel, {
    body: d.text,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const ziel = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenster) => {
    for (const f of fenster) if ("focus" in f) return f.focus();
    return self.clients.openWindow(ziel);
  }));
});
