/** Debug session 7394bb — startup crash instrumentation (remove after verify). */
const DEBUG_ENDPOINT = 'http://127.0.0.1:7800/ingest/0d232d42-7e4c-4aa0-b25b-38b428c3d629';
const DEBUG_SESSION = '7394bb';

const DEBUG_ENABLED =
  import.meta.env.DEV || import.meta.env.MODE === 'preview' || import.meta.env.VITE_DEBUG_BOOT === '1';

export function debugBootTrail(location, data = {}, hypothesisId = '') {
  try {
    const key = 'zarewa.boot.trail';
    const trail = JSON.parse(sessionStorage.getItem(key) || '[]');
    trail.push({ location, data, hypothesisId, at: Date.now() });
    sessionStorage.setItem(key, JSON.stringify(trail.slice(-40)));
  } catch {
    /* ignore */
  }
}

export function debugBootLog(location, message, data = {}, hypothesisId = '') {
  debugBootTrail(location, { message, ...data }, hypothesisId);
  if (!DEBUG_ENABLED) return;
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': DEBUG_SESSION },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION,
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
      runId: 'pre-fix',
    }),
  }).catch(() => {});
  // #endregion
}

export function installDebugBootHandlers() {
  if (typeof window === 'undefined') return;
  if (window.__zarewaDebugBootInstalled) return;
  window.__zarewaDebugBootInstalled = true;

  window.addEventListener('error', (ev) => {
    const payload = {
      message: String(ev?.message || ''),
      filename: String(ev?.filename || ''),
      lineno: ev?.lineno,
      colno: ev?.colno,
    };
    debugBootLog('debugBoot.js:window.error', 'Uncaught window error', payload, 'A');
    try {
      sessionStorage.setItem('zarewa.boot.error', JSON.stringify({ ...payload, at: Date.now() }));
    } catch {
      /* ignore */
    }
  });

  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev?.reason;
    debugBootLog(
      'debugBoot.js:unhandledrejection',
      'Unhandled promise rejection',
      {
        message: String(reason?.message || reason || ''),
        stack: String(reason?.stack || '').slice(0, 800),
      },
      'D'
    );
  });
}
