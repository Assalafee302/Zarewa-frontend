/**
 * User-facing message when `/api/bootstrap` fails before workspace load.
 * @param {number} httpStatus
 * @param {{ error?: string, bootError?: string, mysqlTarget?: string, fixHint?: string } | null | undefined} data
 */
export function formatBootstrapConnectError(httpStatus, data) {
  if (httpStatus === 503 && (data?.bootError || data?.fixHint || data?.mysqlTarget)) {
    const parts = [data?.error || 'API server failed during startup.'];
    if (data?.bootError) parts.push(String(data.bootError));
    if (data?.mysqlTarget) parts.push(`Database target: ${data.mysqlTarget}.`);
    if (data?.fixHint) parts.push(String(data.fixHint));
    return parts.join(' ');
  }
  if (httpStatus === 401 || data?.code === 'AUTH_REQUIRED') {
    return 'Sign in required. Your session cookie may not have been saved — refresh and sign in again.';
  }
  if (data?.detail) {
    return `${data?.error || 'Bootstrap failed'}: ${data.detail}`;
  }
  return data?.error || 'Bootstrap failed';
}

/** Try /api/health when bootstrap fetch failed — server may be up but degraded (MySQL down). */
export async function probeDegradedApiHealth(fetchImpl = fetch, urlFn = (p) => p) {
  try {
    const r = await fetchImpl(urlFn('/api/health'));
    const data = await r.json().catch(() => null);
    if (data?.degraded || data?.bootError) {
      return formatBootstrapConnectError(503, {
        error: 'API server is running but the database is not connected.',
        bootError: data.bootError,
        mysqlTarget: data.mysqlTarget,
        fixHint: data.fixHint,
      });
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** @param {unknown} err */
export function formatBootstrapNetworkError(err) {
  const msg = String(/** @type {{ message?: string }} */ (err)?.message || err || '');
  if (msg === 'Failed to fetch' || /network/i.test(msg)) {
    return (
      'Could not reach the API server. Start the backend (npm run server on port 8787), ' +
      'or use the live app at https://erp.zarewaglobalservices.com.'
    );
  }
  return msg || 'Network request failed';
}
