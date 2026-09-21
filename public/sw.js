/* LogSetGo service worker: makes the web app load instantly and work offline.
 *
 * The VERSION and PRECACHE constants below are filled in by scripts/build-web.js at build time,
 * so every release gets its own cache and old ones are deleted on activate.
 * All URLs are relative to this file, so it works from a sub-path like /LogSetGo/.
 * Only same-origin GET requests are handled; user data lives in localStorage and never touches this cache.
 */
const VERSION = '__VERSION__';
const CACHE = `logsetgo-${VERSION}`;
const PRECACHE = __PRECACHE__;
const INDEX = new URL('index.html', self.location).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('logsetgo-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Page loads: newest version when online, cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(INDEX, copy));
          }
          return res;
        })
        .catch(() => caches.match(INDEX)),
    );
    return;
  }

  // Everything else (hashed JS/CSS, icons): cache first, fill the cache on a miss.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
