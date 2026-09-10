/** Service worker — precache hashed Vite assets; network-first for navigations / index.html. */

const ASSET_CACHE = 'zarewa-assets-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== ASSET_CACHE && k.startsWith('zarewa-'))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/**
 * Cache-first targets. Vite fingerprints as `/assets/Sales-CaM8ZNa0.js` — one dot,
 * hyphen before the hash — so anything under /assets/ is content-addressed and safe
 * to keep forever. Fonts and brand images are not fingerprinted but change rarely;
 * bump ASSET_CACHE to retire them. Never cache-first sw.js, index.html or the
 * manifest, or a bad deploy would be unrecoverable on the device.
 */
function isCacheableAsset(url) {
  try {
    const u = new URL(url);
    if (u.origin !== self.location.origin) return false;
    const p = u.pathname;
    if (p === '/sw.js' || p === '/manifest.webmanifest' || p.endsWith('/index.html')) return false;
    if (/^\/assets\/[^/]+\.(js|css|woff2?|png|jpe?g|svg|webp)$/i.test(p)) return true;
    if (/^\/fonts\/[^/]+\.woff2?$/i.test(p)) return true;
    return /^\/[^/]+\.(png|jpe?g|svg|webp)$/i.test(p);
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const accept = req.headers.get('accept') || '';
  const isNav = req.mode === 'navigate' || accept.includes('text/html');

  // Navigations stay network-first — that is what keeps a new deploy from being shadowed
  // by a stale shell. We only keep a copy so a dropped link still opens the app.
  if (isNav) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok) {
            const cache = await caches.open(ASSET_CACHE);
            await cache.put('/index.html', res.clone());
          }
          return res;
        } catch (err) {
          const cached = await caches.match('/index.html');
          if (cached) return cached;
          throw err;
        }
      })()
    );
    return;
  }

  if (!isCacheableAsset(req.url)) {
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) {
        try {
          await cache.put(req, res.clone());
        } catch {
          /* quota / opaque */
        }
      }
      return res;
    })()
  );
});
