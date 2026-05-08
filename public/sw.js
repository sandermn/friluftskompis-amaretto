const SHELL_CACHE = "friluftskompis-shell-v1";
const TRIP_CACHE = "friluftskompis-trips-v1";

const SHELL_URLS = ["/", "/api/routes"];

// ── Install: pre-cache app shell ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: remove stale caches ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, TRIP_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: network-first for API, cache-first otherwise ─────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    // Network-first with trip-cache fallback
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(TRIP_CACHE)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // Navigation: network-first, fall back to cached shell
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});

// ── Message: manually cache a trip's weather data ────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_TRIP") return;

  const { routeId, weatherUrl } = event.data;
  const client = event.source;

  event.waitUntil(
    caches.open(TRIP_CACHE).then(async (cache) => {
      await cache.add("/api/routes");
      if (weatherUrl) await cache.add(weatherUrl);
      client?.postMessage({ type: "TRIP_CACHED", routeId });
    }),
  );
});
