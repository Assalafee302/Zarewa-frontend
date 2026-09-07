/**
 * Slow / flaky network resilience for workspace bootstrap and API reachability.
 * Distinguishes "sync is slow" (keep working) from "API unreachable" (read-only lock).
 */

/** Quick liveness probe timeout — must stay well under bootstrap timeout. */
export const LIVE_PROBE_TIMEOUT_MS = 8_000;

/**
 * @param {typeof fetch} [fetchImpl]
 * @param {(path: string) => string} [urlFn]
 * @param {number} [timeoutMs]
 * @returns {Promise<{ reachable: boolean; rttMs: number | null }>}
 */
export async function probeApiReachable(
  fetchImpl = fetch,
  urlFn = (p) => p,
  timeoutMs = LIVE_PROBE_TIMEOUT_MS
) {
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId =
    controller != null ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const r = await fetchImpl(urlFn('/api/livez'), {
      method: 'GET',
      credentials: 'include',
      signal: controller?.signal,
    });
    const rttMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
    if (!r.ok) return { reachable: false, rttMs };
    return { reachable: true, rttMs };
  } catch {
    return { reachable: false, rttMs: null };
  } finally {
    if (timeoutId != null) clearTimeout(timeoutId);
  }
}

/**
 * Stretch bootstrap wait when the API is reachable but high-latency (mobile / distant host).
 * @param {number} baseMs
 * @param {number | null | undefined} rttMs
 */
export function adaptiveBootstrapTimeoutMs(baseMs, rttMs) {
  const base = Number(baseMs) || 90_000;
  if (rttMs == null || !Number.isFinite(rttMs) || rttMs < 800) return base;
  // High RTT → give bootstrap more headroom (cap 3 minutes).
  const stretched = Math.round(base + rttMs * 40);
  return Math.min(180_000, Math.max(base, stretched));
}

/**
 * GET with timeout + a single retry after a short pause (covers blip disconnects).
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {{ timeoutMs?: number; retries?: number; fetchImpl?: typeof fetch; pauseMs?: number }} [opts]
 */
export async function fetchWithTimeoutRetry(url, init = {}, opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch;
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const retries = opts.retries ?? 1;
  const pauseMs = opts.pauseMs ?? 1_200;
  let lastErr = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId =
      controller != null ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const signal = init.signal
        ? anyAbortSignal(init.signal, controller?.signal)
        : controller?.signal;
      return await fetchImpl(url, { ...init, signal });
    } catch (err) {
      lastErr = err;
      const aborted = err?.name === 'AbortError';
      const retryable = aborted || /failed to fetch|network/i.test(String(err?.message || err));
      if (!retryable || attempt >= retries) throw err;
      await sleep(pauseMs * (attempt + 1));
    } finally {
      if (timeoutId != null) clearTimeout(timeoutId);
    }
  }
  throw lastErr || new Error('Network request failed');
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Combine caller abort with our timeout abort. */
function anyAbortSignal(a, b) {
  if (!b) return a;
  if (!a) return b;
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any([a, b]);
  }
  const combined = new AbortController();
  const forward = (s) => {
    if (s.aborted) combined.abort();
    else s.addEventListener('abort', () => combined.abort(), { once: true });
  };
  forward(a);
  forward(b);
  return combined.signal;
}
