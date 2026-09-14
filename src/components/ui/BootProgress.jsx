import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * Time-based boot progress while `/api/bootstrap` (or a desk chunk) is in flight.
 *
 * The server does not stream byte progress, so this eases toward ~92% over the expected
 * wait and never claims 100% until the parent unmounts on success — staff still get a
 * honest “how long so far / roughly how long left” read on slow mill links.
 */

const DEFAULT_EXPECTED_MS = 45_000;

function stageForElapsed(elapsedMs) {
  if (elapsedMs < 4_000) return 'Connecting to the live server…';
  if (elapsedMs < 12_000) return 'Loading your workspace…';
  if (elapsedMs < 30_000) return 'Pulling desk data — this can take a minute on a slow link…';
  if (elapsedMs < 60_000) return 'Still working — large desks take longer. No need to refresh.';
  return 'Almost there — hanging on for the final sync…';
}

/** Ease toward `cap` so the bar never falsely completes before the real load finishes. */
export function bootProgressPct(elapsedMs, expectedMs = DEFAULT_EXPECTED_MS, cap = 92) {
  const expected = Math.max(8_000, Number(expectedMs) || DEFAULT_EXPECTED_MS);
  const t = Math.max(0, Number(elapsedMs) || 0) / expected;
  // 1 - e^(-2.2t) reaches ~89% at t=1 and asymptotes under the cap.
  const raw = (1 - Math.exp(-2.2 * t)) * 100;
  return Math.min(cap, Math.round(raw));
}

function formatSeconds(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

/**
 * @param {{
 *   title?: string;
 *   expectedMs?: number;
 *   className?: string;
 *   compact?: boolean;
 * }} props
 */
export function BootProgress({
  title = 'Preparing live workspace…',
  expectedMs = DEFAULT_EXPECTED_MS,
  className = '',
  compact = false,
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const expected = Math.max(8_000, Number(expectedMs) || DEFAULT_EXPECTED_MS);

  useEffect(() => {
    const started = performance.now();
    let raf = 0;
    const tick = () => {
      setElapsedMs(performance.now() - started);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const pct = useMemo(() => bootProgressPct(elapsedMs, expected), [elapsedMs, expected]);
  const remainingMs = Math.max(0, expected - elapsedMs);
  const stage = stageForElapsed(elapsedMs);
  const slow = elapsedMs >= 8_000;

  return (
    <div className={cn(compact ? 'mt-3' : 'mt-4', className)} role="status" aria-live="polite" aria-busy="true">
      {!compact ? (
        <p className="text-xl font-black text-[#134e4a]">{title}</p>
      ) : null}

      <div className={cn('mx-auto', compact ? 'mt-0' : 'mt-4', 'max-w-xs')}>
        <div className="flex items-center justify-between gap-3 text-[11px] font-bold tabular-nums text-slate-500">
          <span>{pct}%</span>
          <span>
            {formatSeconds(elapsedMs)}
            {elapsedMs < expected * 1.4 ? ` · ~${formatSeconds(remainingMs)} left` : ' · still syncing'}
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#e8f0ee]">
          <div
            className="h-full rounded-full bg-[#134e4a] transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className={cn(
            'mx-auto mt-3 h-5 w-5 animate-spin rounded-full border-[3px] border-[#d3e8e5] border-t-[#134e4a]',
            'motion-reduce:animate-none'
          )}
          aria-hidden
        />
        <p className="mt-3 text-[12.5px] leading-snug text-slate-500">{stage}</p>
        {slow ? (
          <p className="mt-2 text-[12px] leading-snug text-slate-400">
            Mill links often need 30–90 seconds for a full workspace. Refreshing restarts the wait.
          </p>
        ) : null}
      </div>
      <span className="sr-only">
        Loading {pct} percent. Elapsed {formatSeconds(elapsedMs)}.
      </span>
    </div>
  );
}

export default BootProgress;
