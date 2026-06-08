import React, { useCallback, useEffect, useState } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

/**
 * Warns 1 minute before inactivity session expiry; ends session when time is up (Phase 12).
 */
export default function SessionTimeoutWarning() {
  const ws = useWorkspace();
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const expiresAtIso = ws?.session?.sessionExpiresAtIso;
  const warningSeconds = Number(ws?.session?.sessionWarningSeconds) || 60;

  const endSession = useCallback(async () => {
    if (ws?.endSessionForTimeout) {
      await ws.endSessionForTimeout();
    } else if (ws?.logout) {
      await ws.logout();
    }
  }, [ws]);

  useEffect(() => {
    setDismissed(false);
  }, [expiresAtIso]);

  useEffect(() => {
    if (!expiresAtIso || ws?.authRequired) {
      setSecondsLeft(null);
      return undefined;
    }

    const tick = () => {
      const ms = new Date(expiresAtIso).getTime() - Date.now();
      if (ms <= 0) {
        setSecondsLeft(0);
        void endSession();
        return;
      }
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
  }, [expiresAtIso, warningSeconds, endSession, ws?.authRequired]);

  if (secondsLeft == null || dismissed || ws?.authRequired) return null;

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
            You will be signed out in <strong>{secondsLeft}</strong> second{secondsLeft === 1 ? '' : 's'} due to
            inactivity. Move the mouse or click Continue to stay signed in.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-amber-800 px-3 py-1.5 text-xs font-bold text-white hover:brightness-110"
              onClick={() => {
                setDismissed(true);
                void ws?.refresh?.();
              }}
            >
              Continue working
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              onClick={() => void endSession()}
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
