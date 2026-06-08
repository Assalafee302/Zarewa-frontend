import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_PING_DEBOUNCE_MS = 5000;

/**
 * Tracks last user click for client-side inactivity timeout.
 * Optionally pings the server (debounced) so the cookie session stays aligned.
 *
 * @param {{
 *   enabled?: boolean;
 *   onServerPing?: () => void | Promise<void>;
 *   pingDebounceMs?: number;
 *   keepAliveWhileUnsaved?: boolean;
 * }} opts
 */
export function useSessionIdleActivity({
  enabled = true,
  onServerPing,
  pingDebounceMs = DEFAULT_PING_DEBOUNCE_MS,
  keepAliveWhileUnsaved = false,
}) {
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
  const pingTimerRef = useRef(null);
  const lastPingAtRef = useRef(0);

  const scheduleServerPing = useCallback(() => {
    if (!enabled || typeof onServerPing !== 'function') return;
    if (pingTimerRef.current) window.clearTimeout(pingTimerRef.current);
    pingTimerRef.current = window.setTimeout(() => {
      pingTimerRef.current = null;
      const now = Date.now();
      if (now - lastPingAtRef.current < pingDebounceMs) return;
      lastPingAtRef.current = now;
      void onServerPing();
    }, pingDebounceMs);
  }, [enabled, onServerPing, pingDebounceMs]);

  const touchActivity = useCallback(() => {
    setLastActivityAt(Date.now());
    scheduleServerPing();
  }, [scheduleServerPing]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onClick = () => touchActivity();
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      if (pingTimerRef.current) window.clearTimeout(pingTimerRef.current);
    };
  }, [enabled, touchActivity]);

  /** While a form is open with unsaved edits, keep the server session alive even without clicks. */
  useEffect(() => {
    if (!enabled || !keepAliveWhileUnsaved || typeof onServerPing !== 'function') return undefined;
    const id = window.setInterval(() => {
      void onServerPing();
    }, 2 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [enabled, keepAliveWhileUnsaved, onServerPing]);

  useEffect(() => {
    if (enabled) setLastActivityAt(Date.now());
  }, [enabled]);

  return { lastActivityAt, touchActivity };
}
