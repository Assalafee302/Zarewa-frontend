/** Short-lived in-memory cache so Sales + RefundModal do not repeat slow list fetches. */

const TTL_MS = 60_000;

/** @type {Map<string, { fetchedAt: number; quotations: object[]; inflight: Promise<object[]> | null }>} */
const states = new Map();

function cacheState(key) {
  if (!states.has(key)) {
    states.set(key, { fetchedAt: 0, quotations: [], inflight: null });
  }
  return states.get(key);
}

export function invalidateEligibleRefundQuotationsCache() {
  states.clear();
}

/**
 * @param {(url: string) => Promise<{ ok: boolean; data?: { ok?: boolean; quotations?: object[] } }>} apiFetch
 * @param {{ force?: boolean; limit?: number }} [opts]
 */
export async function fetchEligibleRefundQuotationsCached(apiFetch, opts = {}) {
  const limit = Math.max(0, Math.floor(Number(opts.limit) || 0));
  const key = limit > 0 ? `limit:${limit}` : 'all';
  const state = cacheState(key);
  const now = Date.now();
  // Cache hits include empty lists — otherwise every mount allocates a fresh [] and re-renders.
  if (!opts.force && state.fetchedAt > 0 && now - state.fetchedAt < TTL_MS) {
    return state.quotations;
  }
  if (!opts.force && state.inflight) {
    return state.inflight;
  }

  state.inflight = (async () => {
    const url =
      limit > 0
        ? `/api/refunds/eligible-quotations?limit=${encodeURIComponent(limit)}`
        : '/api/refunds/eligible-quotations';
    const { ok, data } = await apiFetch(url);
    const rows = ok && data?.ok && Array.isArray(data.quotations) ? data.quotations : [];
    state.quotations = rows;
    state.fetchedAt = Date.now();
    state.inflight = null;
    return rows;
  })();

  return state.inflight;
}
