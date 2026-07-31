import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchEligibleRefundQuotationsCached,
  invalidateEligibleRefundQuotationsCache,
} from './refundEligibleQuotationsCache.js';

describe('refund eligible quotations cache', () => {
  beforeEach(() => {
    invalidateEligibleRefundQuotationsCache();
  });

  it('requests and caches the bounded Sales/modal list (limit=50)', async () => {
    const apiFetch = vi.fn(async (url) => ({
      ok: true,
      data: { ok: true, quotations: [{ id: url }] },
    }));

    const first = await fetchEligibleRefundQuotationsCached(apiFetch, { limit: 50 });
    const cached = await fetchEligibleRefundQuotationsCached(apiFetch, { limit: 50 });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/refunds/eligible-quotations?limit=50');
    expect(cached).toBe(first);
  });

  it('keeps a different cache entry for another limit', async () => {
    const apiFetch = vi.fn(async (url) => ({
      ok: true,
      data: { ok: true, quotations: [{ id: url }] },
    }));

    const limited = await fetchEligibleRefundQuotationsCached(apiFetch, { limit: 20 });
    const defaulted = await fetchEligibleRefundQuotationsCached(apiFetch, { limit: 50 });

    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/refunds/eligible-quotations?limit=20');
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/api/refunds/eligible-quotations?limit=50');
    expect(defaulted).not.toBe(limited);
  });
});
