import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, LogOut, Save } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUnsavedWorkRegistry } from '../../context/UnsavedWorkContext';
import { useSessionIdleActivity } from '../../hooks/useSessionIdleActivity';

/**
 * Inactivity timeout from the last platform click (Phase 12+).
 * Auto sign-out is blocked while any form has unsaved changes.
 */
export default function SessionTimeoutWarning() {
  const ws = useWorkspace();
  const { hasUnsavedWork } = useUnsavedWorkRegistry();
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const timeoutMinutes = Number(ws?.session?.sessionTimeoutMinutes) || 15;
  const warningSeconds = Number(ws?.session?.sessionWarningSeconds) || 60;
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const enabled = Boolean(ws?.session?.user && !ws?.authRequired);

  const { lastActivityAt, touchActivity } = useSessionIdleActivity({
    enabled,
    onServerPing: ws?.refresh,
    keepAliveWhileUnsaved: hasUnsavedWork,
  });

  const expiresAtMs = useMemo(() => lastActivityAt + timeoutMs, [lastActivityAt, timeoutMs]);

  const endSession = useCallback(async () => {
    if (hasUnsavedWork) return;
    if (ws?.endSessionForTimeout) {
      await ws.endSessionForTimeout();
    } else if (ws?.logout) {
      await ws.logout();
    }
  }, [hasUnsavedWork, ws]);

  useEffect(() => {
    setDismissed(false);
  }, [lastActivityAt]);

  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(null);
      setSessionPaused(false);
      return undefined;
    }

    const tick = () => {
      const ms = expiresAtMs - Date.now();
      if (ms <= 0) {
        if (hasUnsavedWork) {
          setSessionPaused(true);
          setSecondsLeft(null);
          return;
        }
        setSessionPaused(false);
        setSecondsLeft(0);
        void endSession();
        return;
      }
      setSessionPaused(false);
      const sec = Math.ceil(ms / 1000);
      if (sec <= warningSeconds) {
        setSecondsLeft(sec);
      } else {
        setSecondsLeft(null);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [enabled, expiresAtMs, warningSeconds, endSession, hasUnsavedWork]);

  if (ws?.authRequired) return null;

  if (sessionPaused && hasUnsavedWork) {
    return (
      <div
        role="alert"
        className="fixed bottom-4 left-1/2 z-[80] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-teal-300 bg-teal-50 px-4 py-3 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <Save size={20} className="mt-0.5 shrink-0 text-teal-800" />
          <div className="min-w-0 flex-1 text-sm text-teal-950">
            <p className="font-bold">Session on hold</p>
            <p className="mt-1">
              You have unsaved changes in an open form. Sign-out is paused until you save or discard
              your work. Click anywhere after saving to reset the inactivity timer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (secondsLeft == null || dismissed) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-[80] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-xl"
    >
      <div className="flex items-start gap-3">
        <Clock size={20} className="mt-0.5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1 text-sm text-amber-950">
          <p className="font-bold">Session expiring soon</p>
          <p className="mt-1">
            You will be signed out in <strong>{secondsLeft}</strong> second
            {secondsLeft === 1 ? '' : 's'} without a click in the app. Click anywhere or use
            Continue to stay signed in.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-amber-800 px-3 py-1.5 text-xs font-bold text-white hover:brightness-110"
              onClick={() => {
                setDismissed(true);
                touchActivity();
                void ws?.refresh?.();
              }}
            >
              Continue working
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              onClick={() => void endSession()}
              disabled={hasUnsavedWork}
              title={hasUnsavedWork ? 'Save or discard open forms before signing out.' : ''}
            >
              <LogOut size={14} />
              Sign out now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
