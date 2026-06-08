import { lazy } from 'react';

const CHUNK_RELOAD_PREFIX = 'zarewa.chunk-reload';

/** @param {unknown} error */
export function isChunkLoadError(error) {
  const msg = String(error?.message || error || '');
  return /Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed|error loading dynamically imported module/i.test(
    msg
  );
}

/**
 * @param {() => Promise<{ default: React.ComponentType<unknown> }>} importer
 * @param {{ id?: string }} [opts]
 */
async function importWithChunkReload(importer, opts = {}) {
  const id = String(opts.id || 'chunk');
  try {
    return await importer();
  } catch (err) {
    if (!isChunkLoadError(err)) throw err;
    const buildId = typeof __ZAREWA_BUILD_ID__ !== 'undefined' ? __ZAREWA_BUILD_ID__ : 'unknown';
    const key = `${CHUNK_RELOAD_PREFIX}:${buildId}:${id}`;
    let alreadyReloaded = false;
    try {
      alreadyReloaded = sessionStorage.getItem(key) === '1';
    } catch {
      /* ignore */
    }
    if (!alreadyReloaded && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(key, '1');
      } catch {
        /* ignore */
      }
      const url = new URL(window.location.href);
      url.searchParams.set('_cb', String(Date.now()));
      window.location.replace(url.toString());
      return new Promise(() => {});
    }
    throw err;
  }
}

/**
 * React.lazy wrapper that auto-reloads once when a lazy chunk 404s after deploy.
 * @param {() => Promise<{ default: React.ComponentType<unknown> }>} importer
 * @param {{ id?: string }} [opts]
 */
export function lazyWithRetry(importer, opts = {}) {
  return lazy(() => importWithChunkReload(importer, opts));
}
