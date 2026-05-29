/** Debug session 7394bb — startup crash instrumentation (remove after verify). */
const DEBUG_ENDPOINT = 'http://127.0.0.1:7800/ingest/0d232d42-7e4c-4aa0-b25b-38b428c3d629';
const DEBUG_SESSION = '7394bb';

export function debugBootLog(location, message, data = {}, hypothesisId = '') {
  if (!import.meta.env.DEV) return;
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
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;
  if (window.__zarewaDebugBootInstalled) return;
  window.__zarewaDebugBootInstalled = true;

  window.addEventListener('error', (ev) => {
    debugBootLog(
      'debugBoot.js:window.error',
      'Uncaught window error',
      {
        message: String(ev?.message || ''),
        filename: String(ev?.filename || ''),
        lineno: ev?.lineno,
        colno: ev?.colno,
      },
      'A'
    );
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
