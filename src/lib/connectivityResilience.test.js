import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  adaptiveBootstrapTimeoutMs,
  fetchWithTimeoutRetry,
  probeApiReachable,
} from './connectivityResilience.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('adaptiveBootstrapTimeoutMs', () => {
  it('keeps the base timeout on low RTT', () => {
    expect(adaptiveBootstrapTimeoutMs(90_000, 200)).toBe(90_000);
  });

  it('stretches timeout on high RTT and caps at 3 minutes', () => {
    expect(adaptiveBootstrapTimeoutMs(90_000, 1_500)).toBe(90_000 + 1_500 * 40);
    expect(adaptiveBootstrapTimeoutMs(90_000, 10_000)).toBe(180_000);
  });
});

describe('probeApiReachable', () => {
  it('reports reachable when livez succeeds', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }));
    const result = await probeApiReachable(fetchImpl, (p) => p, 5_000);
    expect(result.reachable).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/livez',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('reports unreachable on network failure', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const result = await probeApiReachable(fetchImpl, (p) => p, 5_000);
    expect(result.reachable).toBe(false);
  });
});

describe('fetchWithTimeoutRetry', () => {
  it('retries once after a transient network error', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('Failed to fetch');
      return { ok: true, status: 200 };
    });
    const res = await fetchWithTimeoutRetry(
      '/api/bootstrap',
      { method: 'GET' },
      { fetchImpl, timeoutMs: 5_000, retries: 1, pauseMs: 1 }
    );
    expect(res.ok).toBe(true);
    expect(calls).toBe(2);
  });
});
