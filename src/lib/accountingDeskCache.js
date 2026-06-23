/** Short-lived cache so Accounting Desk tabs reopen instantly after first load. */
const TTL_MS = 120_000;

/** @type {Map<string, { at: number, data: unknown }>} */
const cache = new Map();

export function getAccountingDeskCache(key) {
  const k = String(key || '').trim();
  if (!k) return null;
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  if (hit) cache.delete(k);
  return null;
}

export function setAccountingDeskCache(key, data) {
  const k = String(key || '').trim();
  if (!k || data == null) return;
  cache.set(k, { at: Date.now(), data });
}

export function invalidateAccountingDeskCache(key) {
  const k = String(key || '').trim();
  if (k) cache.delete(k);
}

export function invalidateAllAccountingDeskCache() {
  cache.clear();
}
