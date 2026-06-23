const TTL_MS = 120_000;

/** @type {Map<string, { at: number, data: object }>} */
const customerBriefCache = new Map();

/** @type {Map<string, { at: number, data: object }>} */
const tabPayloadCache = new Map();

export function getCachedCustomerBrief(customerId) {
  const id = String(customerId || '').trim();
  if (!id) return null;
  const hit = customerBriefCache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  return null;
}

export function setCachedCustomerBrief(customerId, data) {
  const id = String(customerId || '').trim();
  if (!id || !data) return;
  customerBriefCache.set(id, { at: Date.now(), data });
}

export function getCachedTabPayload(key) {
  const k = String(key || '').trim();
  if (!k) return null;
  const hit = tabPayloadCache.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  return null;
}

export function setCachedTabPayload(key, data) {
  const k = String(key || '').trim();
  if (!k || !data) return;
  tabPayloadCache.set(k, { at: Date.now(), data });
}

export function invalidateTabPayload(key) {
  const k = String(key || '').trim();
  if (k) tabPayloadCache.delete(k);
}
