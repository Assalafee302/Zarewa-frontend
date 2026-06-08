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
 * Reload once per build + chunk id when a lazy file 404s after deploy.
 * @param {unknown} error
 * @param {string} [chunkId]
 * @returns {boolean} true if a reload was triggered
 */
export function attemptChunkReload(error, chunkId = 'global') {
  if (!isChunkLoadError(error) || typeof window === 'undefined') return false;
  const buildId = typeof __ZAREWA_BUILD_ID__ !== 'undefined' ? __ZAREWA_BUILD_ID__ : 'unknown';
  const key = `${CHUNK_RELOAD_PREFIX}:${buildId}:${chunkId}`;
  let alreadyReloaded = false;
  try {
    alreadyReloaded = sessionStorage.getItem(key) === '1';
  } catch {
    /* ignore */
  }
  if (alreadyReloaded) return false;
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  url.searchParams.set('_cb', String(Date.now()));
  window.location.replace(url.toString());
  return true;
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
    if (attemptChunkReload(err, id)) return new Promise(() => {});
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

/** Catch nested dynamic imports (e.g. HR hub tabs) that bypass App.jsx lazy wrappers. */
export function installChunkReloadHandlers() {
  if (typeof window === 'undefined') return;
  if (window.__zarewaChunkHandlersInstalled) return;
  window.__zarewaChunkHandlersInstalled = true;

  window.addEventListener('unhandledrejection', (ev) => {
    if (attemptChunkReload(ev?.reason, 'unhandled')) {
      ev.preventDefault();
    }
  });
}
