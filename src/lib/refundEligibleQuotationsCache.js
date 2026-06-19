/** Short-lived in-memory cache so Sales + RefundModal do not repeat slow list fetches. */

const TTL_MS = 60_000;

/** @type {{ fetchedAt: number; quotations: object[]; inflight: Promise<object[]> | null }} */
const state = {
  fetchedAt: 0,
  quotations: [],
  inflight: null,
};

export function invalidateEligibleRefundQuotationsCache() {
  state.fetchedAt = 0;
  state.quotations = [];
  state.inflight = null;
}

/**
 * @param {(url: string) => Promise<{ ok: boolean; data?: { ok?: boolean; quotations?: object[] } }>} apiFetch
 * @param {{ force?: boolean }} [opts]
 */
export async function fetchEligibleRefundQuotationsCached(apiFetch, opts = {}) {
  const now = Date.now();
  if (!opts.force && state.quotations.length > 0 && now - state.fetchedAt < TTL_MS) {
    return state.quotations;
  }
  if (!opts.force && state.inflight) {
    return state.inflight;
  }

  state.inflight = (async () => {
    const { ok, data } = await apiFetch('/api/refunds/eligible-quotations');
    const rows = ok && data?.ok && Array.isArray(data.quotations) ? data.quotations : [];
    state.quotations = rows;
    state.fetchedAt = Date.now();
    state.inflight = null;
    return rows;
  })();

  return state.inflight;
}
