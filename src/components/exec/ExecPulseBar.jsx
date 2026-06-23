import React from 'react';

const TONE = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  red: 'border-rose-200 bg-rose-50 text-rose-950',
};

function PulseCard({ label, detail, status, estimated }) {
  const tone = TONE[status] || TONE.amber;
  return (
    <div className={`rounded-xl border px-3 py-2.5 min-w-0 ${tone}`}>
      <p className="text-[9px] font-black uppercase tracking-wide opacity-80 flex items-center gap-1">
        {label}
        {estimated ? (
          <span className="rounded px-1 py-0.5 text-[7px] bg-white/60 ring-1 ring-black/5">Est.</span>
        ) : null}
      </p>
      <p className="mt-1 text-[11px] font-bold leading-snug truncate">{detail}</p>
    </div>
  );
}

/**
 * Five-pulse health strip for MD Command Centre.
 */
export function ExecPulseBar({ pulses, formatNgn, loading }) {
  if (loading && !pulses) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-200/80 animate-pulse" />
        ))}
      </div>
    );
  }
  const p = pulses || {};
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 mb-6" aria-label="Company pulses">
      <PulseCard
        label="Cash"
        status={p.cash?.status}
        estimated={p.cash?.estimated}
        detail={
          p.cash?.weeksCover != null
            ? `${p.cash.weeksCover} wks cover · ${typeof formatNgn === 'function' ? formatNgn(p.cash.valueNgn) : '—'}`
            : p.cash?.label || '—'
        }
      />
      <PulseCard
        label="Coil"
        status={p.coil?.status}
        estimated={p.coil?.estimated}
        detail={
          p.coil?.weeksCover != null ? `${p.coil.weeksCover} wks min cover` : p.coil?.label || '—'
        }
      />
      <PulseCard
        label="Metres"
        status={p.metres?.status}
        detail={
          p.metres?.target != null
            ? `${(p.metres.completed ?? 0).toLocaleString()} / ${p.metres.target.toLocaleString()} m`
            : `${(p.metres?.completed ?? 0).toLocaleString()} m · ${p.metres?.label || '—'}`
        }
      />
      <PulseCard label="Margin" status={p.margin?.status} detail={p.margin?.label || '—'} />
      <PulseCard label="People" status={p.people?.status} detail={p.people?.label || '—'} />
    </div>
  );
}
