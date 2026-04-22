import { auth } from './firebase.js';

const ZAREWA_CSRF_COOKIE = 'zarewa_csrf';

/**
 * Unauthenticated session endpoints: server sets `zarewa_session` + `zarewa_csrf` on the response;
 * the browser has no `zarewa_csrf` to echo yet, so we must not require X-CSRF-Token.
 */
const CSRF_EXEMPT_MUTATION_PATHS = new Set([
  '/api/session/login',
  '/api/session/firebase',
  '/api/session/forgot-password',
  '/api/session/reset-password',
]);

/** Base URL for API (empty = same origin, e.g. Vite proxy `/api` → backend). */
export function apiUrl(path) {
  const base = String(import.meta.env.VITE_API_BASE ?? '')
    .trim()
    .replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
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
  const user = auth?.currentUser;
  if (user && !headers.Authorization) {
    try {
      const idToken = await user.getIdToken();
      headers.Authorization = `Bearer ${idToken}`;
    } catch {
      /* ignore: offline or token refresh failure */
    }
  }

  const r = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers,
  });
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
        ? 'API route not found (server returned an HTML 404). Use a current API build and restart it. With Vite, run the API on port 8787 (npm run server) so /api proxies correctly, or set VITE_API_BASE to your API origin. Production: redeploy and restart the Node server.'
        : String(text || 'Invalid JSON').slice(0, 500),
    };
  }
  return { ok: r.ok, status: r.status, data };
}
