/*
 * 3Brothers storefront service worker.
 *
 * - API requests: never cached. Stock, order status, and totals must always be
 *   live — a cached order status would tell a customer their delivery hasn't
 *   been confirmed when it has.
 * - Navigations: network-first, falling back to the last cached copy of that
 *   page so a shop stays browsable offline. Stale prices are safe here: the
 *   server recomputes every total from store_products when the order is
 *   placed, so a stale page can never lock in an old price.
 * - Build assets and icons: cache-first (immutable by content hash).
 */
const CACHE = "3brothers-v1";

self.addEventListener("install", () => {
  // Nothing to precache: every page belongs to a store we don't know yet.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // "/" redirects to the default shop. A response that followed a
          // redirect must never be cached: replaying one for a navigation
          // throws ("... response was redirected but the request mode was not
          // 'follow'"), which would break the app offline rather than falling
          // back. The redirect target caches itself on its own request.
          if (!response.redirected) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || Response.error()),
        ),
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg");

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
