/**
 * Client-side idempotency key generation for safe POST retries.
 */

/**
 * @param {string} [prefix]
 * @returns {string}
 */
export function generateIdempotencyKey(prefix = 'zare') {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  const key = `${prefix}_${rand}`.slice(0, 128);
  return key.replace(/[^A-Za-z0-9_-]/g, '_');
}

/**
 * Merge Idempotency-Key into fetch options for POST/PATCH/PUT.
 * @param {RequestInit} [options]
 * @param {string} [prefix]
 * @returns {RequestInit}
 */
export function withIdempotencyHeaders(options = {}, prefix) {
  const method = String(options.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return options;
  const existing = options.headers?.['Idempotency-Key'] || options.headers?.['idempotency-key'];
  if (existing) return options;
  const key = generateIdempotencyKey(prefix);
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Idempotency-Key': key,
    },
  };
}

/**
 * POST helper with automatic idempotency key.
 * @param {string} path
 * @param {unknown} body
 * @param {{ prefix?: string; method?: string; headers?: Record<string,string> }} [opts]
 * @param {(path: string, options?: RequestInit) => Promise<{ ok: boolean; status: number; data: unknown }>} apiFetchFn
 */
export async function apiMutate(apiFetchFn, path, body, opts = {}) {
  const method = opts.method || 'POST';
  const options = withIdempotencyHeaders(
    {
      method,
      body: body != null ? JSON.stringify(body) : undefined,
      headers: opts.headers,
    },
    opts.prefix
  );
  return apiFetchFn(path, options);
}
