const ZAREWA_CSRF_COOKIE = 'zarewa_csrf';

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
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (needsCsrf && !exempt && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  let r;
  try {
    r = await fetch(apiUrl(path), {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (err) {
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
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    const htmlExpressMissingRoute =
      /<pre>\s*Cannot\s+(POST|GET|PUT|PATCH|DELETE)\s+\//i.test(text || '') ||
      (/Cannot\s+POST\s+\//i.test(text || '') && /<!DOCTYPE\s+html/i.test(text || ''));
    data = {
      ok: false,
      code: 'NON_JSON_RESPONSE',
      error: htmlExpressMissingRoute
        ? 'API route not found (server returned an HTML 404). Common causes: (1) API server is an old build — redeploy backend with current routes and restart. (2) VITE_API_BASE ends with /api while the app calls /api/... — set the base to the site origin only (e.g. https://host) not https://host/api. Dev: run the API on port 8787 so Vite can proxy /api, or set VITE_API_BASE to the API origin.'
        : String(text || 'Invalid JSON').slice(0, 500),
    };
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
