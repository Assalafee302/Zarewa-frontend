import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchEligibleRefundQuotationsCached,
  invalidateEligibleRefundQuotationsCache,
} from './refundEligibleQuotationsCache.js';

describe('refund eligible quotations cache', () => {
  beforeEach(() => {
    invalidateEligibleRefundQuotationsCache();
  });

  it('requests and caches a bounded modal list separately from the full list', async () => {
    const apiFetch = vi.fn(async (url) => ({
      ok: true,
      data: { ok: true, quotations: [{ id: url }] },
    }));

    const limitedFirst = await fetchEligibleRefundQuotationsCached(apiFetch, { limit: 20 });
    const limitedCached = await fetchEligibleRefundQuotationsCached(apiFetch, { limit: 20 });
    const full = await fetchEligibleRefundQuotationsCached(apiFetch);

    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/refunds/eligible-quotations?limit=20');
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/api/refunds/eligible-quotations');
    expect(limitedCached).toBe(limitedFirst);
    expect(full).not.toBe(limitedFirst);
  });
});
