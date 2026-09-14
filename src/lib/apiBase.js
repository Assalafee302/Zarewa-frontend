import { generateIdempotencyKey } from './idempotency.js';

const ZAREWA_CSRF_COOKIE = 'zarewa_csrf';
const UNCERTAIN_MUTATIONS_STORAGE_KEY = 'zarewa_uncertain_mutations_v1';
const UNCERTAIN_MUTATION_TTL_MS = 10 * 60_000;
const uncertainMutationKeys = new Map();

function loadUncertainMutationKeys() {
  if (uncertainMutationKeys.size || typeof sessionStorage === 'undefined') return;
  try {
    const stored = JSON.parse(sessionStorage.getItem(UNCERTAIN_MUTATIONS_STORAGE_KEY) || '{}');
    const cutoff = Date.now() - UNCERTAIN_MUTATION_TTL_MS;
    for (const [fingerprint, entry] of Object.entries(stored)) {
      if (entry?.key && Number(entry.updatedAt) >= cutoff) {
        uncertainMutationKeys.set(fingerprint, entry);
      }
    }
  } catch {
    // A damaged browser cache must never block saving.
  }
}

function persistUncertainMutationKeys() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      UNCERTAIN_MUTATIONS_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(uncertainMutationKeys))
    );
  } catch {
    // Private browsing/storage quota: in-memory double-submit protection still works.
  }
}

function mutationFingerprint(method, path, body) {
  if (body == null || typeof body === 'string') return `${method}|${path}|${body || ''}`;
  return '';
}

function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return String(headers.get(name) || '');
  const wanted = name.toLowerCase();
  const pair = Object.entries(headers).find(([key]) => key.toLowerCase() === wanted);
  return pair ? String(pair[1] || '') : '';
}

function rememberMutation(fingerprint, key) {
  if (!fingerprint || !key) return;
  uncertainMutationKeys.set(fingerprint, { key, updatedAt: Date.now() });
  persistUncertainMutationKeys();
}

function forgetMutation(fingerprint, key) {
  if (!fingerprint || uncertainMutationKeys.get(fingerprint)?.key !== key) return;
  uncertainMutationKeys.delete(fingerprint);
  persistUncertainMutationKeys();
}

/**
 * Unauthenticated session endpoints: server sets `zarewa_session` + `zarewa_csrf` on the response;
 * the browser has no `zarewa_csrf` to echo yet, so we must not require X-CSRF-Token.
 */
const CSRF_EXEMPT_MUTATION_PATHS = new Set([
  '/api/session/login',
  '/api/session/forgot-password',
  '/api/session/reset-password',
  '/api/session/timeout',
]);

/** Base URL for API (empty = same origin, e.g. Vite proxy `/api` → backend). */
export function apiUrl(path) {
  let base = String(import.meta.env.VITE_API_BASE ?? '').trim().replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  /** Paths already include `/api/...`. If base ends with `/api`, joining would produce `/api/api/...` (Express 404). */
  if (base && p.startsWith('/api/') && /\/api$/i.test(base)) {
    base = base.replace(/\/api$/i, '');
  }
  return `${base}${p}`;
}

/**
 * Read `zarewa_csrf` from `document.cookie` (handles multiple cookies; value may be URL-encoded).
 * @returns {string|null} decoded value, or null if missing
 */
export function getZarewaCsrfFromDocumentCookie() {
  if (typeof document === 'undefined') return null;
  const prefix = `${ZAREWA_CSRF_COOKIE}=`;
  const parts = String(document.cookie || '').split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) continue;
    const raw = trimmed.slice(prefix.length).trim();
    if (raw === '') return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

function getApiPathname(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return p.split(/[?#]/)[0] || '';
}

function isCsrfExemptMutation(path, method) {
  const m = String(method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD') return true;
  const pathname = getApiPathname(path);
  return CSRF_EXEMPT_MUTATION_PATHS.has(pathname);
}

function isRawFetchBody(value) {
  if (value == null) return false;
  if (typeof FormData !== 'undefined' && value instanceof FormData) return true;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) return true;
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return true;
  if (ArrayBuffer.isView(value)) return true;
  return false;
}

/** Objects must be JSON.stringify'd; a plain object becomes "[object Object]" on the wire. */
export function serializeApiRequestBody(rawBody) {
  if (rawBody == null) return undefined;
  if (typeof rawBody === 'string') return rawBody;
  if (isRawFetchBody(rawBody)) return rawBody;
  return JSON.stringify(rawBody);
}

function networkErrorResult(err) {
  return {
    ok: false,
    status: 0,
    data: {
      ok: false,
      code: 'NETWORK_ERROR',
      error:
        err?.message === 'Failed to fetch'
          ? 'Could not reach the server. Check your connection and that the API is running.'
          : String(err?.message || err || 'Network request failed'),
    },
  };
}

function redirectToAppEntryForLogin() {
  if (typeof window === 'undefined') return;
  const base = String(import.meta.env.BASE_URL || '/');
  const target = base.endsWith('/') ? base : `${base}/`;
  window.location.replace(target);
}

export async function apiFetch(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const needsCsrf = method !== 'GET' && method !== 'HEAD';
  const exempt = isCsrfExemptMutation(path, method);
  const {
    body: rawBody,
    headers: optionHeaders,
    _idempotencyPoll = 0,
    ...rest
  } = options;
  const body = serializeApiRequestBody(rawBody);

  const csrfToken = needsCsrf && !exempt ? getZarewaCsrfFromDocumentCookie() : null;
  if (needsCsrf && !exempt && (csrfToken == null || csrfToken === '')) {
    const msg = `[apiFetch] CSRF: "${ZAREWA_CSRF_COOKIE}" cookie is missing; mutating requests require it. Sign in again.`;
    console.error(msg);
    redirectToAppEntryForLogin();
    return {
      ok: false,
      status: 403,
      data: { code: 'CSRF_MISSING', error: 'Session CSRF token missing. Please sign in again.' },
    };
  }

  const headers = {
    ...(isRawFetchBody(rawBody) ? {} : { 'Content-Type': 'application/json' }),
    ...(optionHeaders || {}),
  };
  const fingerprint =
    needsCsrf && !exempt && !isRawFetchBody(rawBody)
      ? mutationFingerprint(method, path, body)
      : '';
  let operationKey = headerValue(headers, 'Idempotency-Key');
  if (fingerprint && !operationKey) {
    loadUncertainMutationKeys();
    operationKey =
      uncertainMutationKeys.get(fingerprint)?.key || generateIdempotencyKey('operation');
    headers['Idempotency-Key'] = operationKey;
  }
  if (fingerprint && operationKey) rememberMutation(fingerprint, operationKey);
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    delete headers['Content-Type'];
  }
  if (needsCsrf && !exempt && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  let r;
  try {
    const init = {
      ...rest,
      method,
      credentials: 'include',
      headers,
    };
    if (body !== undefined) init.body = body;
    r = await fetch(apiUrl(path), init);
  } catch (firstErr) {
    // One silent retry for idempotent GETs — covers brief mobile blips without double-posting.
    const canRetryGet = method === 'GET' || method === 'HEAD';
    if (canRetryGet) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 700));
        const init = {
          ...rest,
          method,
          credentials: 'include',
          headers,
        };
        if (body !== undefined) init.body = body;
        r = await fetch(apiUrl(path), init);
      } catch (retryErr) {
        return networkErrorResult(retryErr);
      }
    } else {
      // Keep the operation ID: a retry or repeated button press must check the first save,
      // not create a second row when the response was lost.
      return networkErrorResult(firstErr);
    }
  }
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    const htmlExpressMissingRoute =
      /<pre>\s*Cannot\s+(POST|GET|PUT|PATCH|DELETE)\s+\//i.test(text || '') ||
      (/Cannot\s+POST\s+\//i.test(text || '') && /<!DOCTYPE\s+html/i.test(text || ''));
    const htmlExpressBadJson =
      /<!DOCTYPE\s+html/i.test(text || '') && /not valid JSON/i.test(text || '');
    data = {
      ok: false,
      code: htmlExpressBadJson ? 'INVALID_JSON' : 'NON_JSON_RESPONSE',
      error: htmlExpressMissingRoute
        ? 'API route not found (server returned an HTML 404). Common causes: (1) API server is an old build — redeploy backend with current routes and restart. (2) VITE_API_BASE ends with /api while the app calls /api/... — set the base to the site origin only (e.g. https://host) not https://host/api. Dev: run the API on port 8787 so Vite can proxy /api, or set VITE_API_BASE to the API origin.'
        : htmlExpressBadJson
          ? 'The server could not read that request. Refresh and try again.'
          : String(text || 'Invalid JSON').slice(0, 500),
    };
  }
  if (data?.code === 'IDEMPOTENCY_IN_PROGRESS' && _idempotencyPoll < 3) {
    const retryAfterMs = Math.max(250, Math.min(2_000, Number(data.retryAfterMs) || 750));
    await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
    return apiFetch(path, {
      ...options,
      headers,
      _idempotencyPoll: _idempotencyPoll + 1,
    });
  }
  if (fingerprint && operationKey && data?.code !== 'IDEMPOTENCY_IN_PROGRESS') {
    // Any definite server response resolves the uncertainty. A later intentional save
    // with identical values receives a fresh operation ID.
    forgetMutation(fingerprint, operationKey);
  }
  if (
    r.ok &&
    data?.ok !== false &&
    data?.delta &&
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function'
  ) {
    window.dispatchEvent(
      new CustomEvent('zarewa:write-delta', {
        detail: { delta: data.delta, path, operationKey: operationKey || '' },
      })
    );
  }
  return { ok: r.ok, status: r.status, data };
}

/**
 * Normalize API error payloads to a single user-facing string.
 * @param {unknown} data
 * @param {string} [fallback]
 * @returns {{ message: string; code: string|null }}
 */
export function parseApiError(data, fallback = 'Something went wrong. Please try again.') {
  if (data == null) return { message: fallback, code: null };
  if (typeof data === 'string') return { message: data.trim() || fallback, code: null };
  const obj = /** @type {Record<string, unknown>} */ (data);
  const message = String(obj.error || obj.message || fallback).trim() || fallback;
  const code = obj.code != null ? String(obj.code) : null;
  return { message, code };
}
