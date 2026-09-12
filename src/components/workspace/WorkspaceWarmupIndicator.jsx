import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWorkspace } from '../../context/WorkspaceContext';

/**
 * Desk names as staff say them, not as the packs are keyed.
 * "operations" means nothing to a cashier; "Operations & stock" does.
 */
const DESK_LABELS = Object.freeze({
  sales: 'Sales & customers',
  operations: 'Operations & stock',
  finance: 'Finance & cashier',
  procurement: 'Procurement & suppliers',
});

/** How long the finished state stays up before the pill leaves. */
const DONE_VISIBLE_MS = 2200;

/**
 * Shows how much of the workspace has arrived while the remaining desks warm up.
 *
 * Deliberately a corner pill and not a blocking splash: the desk the user landed on is
 * already loaded by the time this appears, so making them watch a full-screen bar would
 * cost them the seconds this whole change exists to give back. What it answers is the
 * question staff actually had — "is my colleague's quotation here yet, or is the system
 * still fetching?" — which before had no visible answer at all.
 */
export function WorkspaceWarmupIndicator() {
  const ws = useWorkspace();
  const warmup = ws?.warmup;
  const running = Boolean(warmup?.running);
  const total = Number(warmup?.total) || 0;
  const done = Number(warmup?.done) || 0;

  const [showDone, setShowDone] = useState(false);
  const wasRunningRef = useRef(false);

  useEffect(() => {
    if (running) {
      wasRunningRef.current = true;
      setShowDone(false);
      return undefined;
    }
    // Only celebrate a warm-up that actually ran and actually finished. A run superseded
    // by a branch switch clears `running` with packs still missing; claiming "ready"
    // there would be the same false reassurance the old silent loading gave.
    if (!wasRunningRef.current) return undefined;
    wasRunningRef.current = false;
    if (!total || done < total) return undefined;
    setShowDone(true);
    const t = window.setTimeout(() => setShowDone(false), DONE_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [running, done, total]);

  if (!running && !showDone) return null;

  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const active = String(warmup?.active || '');
  const activeLabel = DESK_LABELS[active] || 'workspace';

  return (
    <div
      className={cn(
        'fixed z-[160] w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl border bg-white/95 px-3.5 py-3 shadow-lg backdrop-blur-sm',
        // Sits above the floating action buttons (chat, assistant) rather than under them:
        // those are 3.75rem tall on a 1.25rem inset, so this clears them by a comfortable
        // margin and never hides a control the user reaches for.
        'right-[max(1.25rem,env(safe-area-inset-right))] bottom-[max(5.75rem,calc(env(safe-area-inset-bottom)+5.75rem))]',
        showDone ? 'border-emerald-200' : 'border-teal-200'
      )}
      role="status"
      aria-live="polite"
      aria-busy={running ? 'true' : 'false'}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
        {showDone ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zarewa-teal" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate">
          {showDone ? 'Whole workspace loaded' : `Loading ${activeLabel}…`}
        </span>
        <span className="shrink-0 tabular-nums text-[11px] font-bold text-gray-500">
          {showDone ? '100%' : `${pct}%`}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300 ease-out',
            showDone ? 'bg-emerald-500' : 'bg-zarewa-teal'
          )}
          style={{ width: `${showDone ? 100 : pct}%` }}
        />
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
        {showDone
          ? 'Every desk you can open is now loaded.'
          : 'You can keep working — the rest of the desks are loading in the background.'}
      </p>
    </div>
  );
}

export default WorkspaceWarmupIndicator;
