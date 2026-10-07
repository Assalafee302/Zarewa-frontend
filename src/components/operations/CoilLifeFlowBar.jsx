import React from 'react';

/**
 * received → used → remaining → tail, scaled to the received kg.
 */
export function CoilLifeFlowBar({ receivedKg = 0, usedKg = 0, remainingKg = 0, tailKg = 0 }) {
  const received = Math.max(0, Number(receivedKg) || 0);
  const used = Math.max(0, Number(usedKg) || 0);
  const remaining = Math.max(0, Number(remainingKg) || 0);
  const tail = Math.max(0, Number(tailKg) || 0);
  const total = Math.max(received, used + remaining + tail, 1);
  const pct = (n) => `${Math.max(0, (n / total) * 100)}%`;
  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <div data-screen="coil-flow">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Received, used, remaining, and tail">
        <span className="h-full bg-zarewa-teal" style={{ width: pct(used) }} />
        <span className="h-full bg-sky-400" style={{ width: pct(remaining) }} />
        <span className="h-full bg-amber-400" style={{ width: pct(tail) }} />
      </div>
      <ol className="mt-2 grid grid-cols-2 gap-2 text-ui-xs sm:grid-cols-4">
        <li>
          <p className="text-slate-500">Received</p>
          <p className="font-semibold tabular-nums text-slate-900">{fmt(received)} kg</p>
        </li>
        <li>
          <p className="text-slate-500">Used</p>
          <p className="font-semibold tabular-nums text-zarewa-teal">{fmt(used)} kg</p>
        </li>
        <li>
          <p className="text-slate-500">Remaining</p>
          <p className="font-semibold tabular-nums text-sky-800">{fmt(remaining)} kg</p>
        </li>
        <li>
          <p className="text-slate-500">Tail</p>
          <p className="font-semibold tabular-nums text-amber-900">{fmt(tail)} kg</p>
        </li>
      </ol>
    </div>
  );
}
