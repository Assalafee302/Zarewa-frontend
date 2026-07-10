import React from 'react';
import { Activity } from 'lucide-react';

const TONE = {
  green: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-900',
  amber: 'border-amber-200/80 bg-amber-50/80 text-amber-950',
  red: 'border-rose-200/80 bg-rose-50/80 text-rose-950',
};

function PulseCard({ label, detail, status, estimated }) {
  const tone = TONE[status] || TONE.amber;
  return (
    <div className={`rounded-lg border px-3 py-2.5 min-w-0 ${tone}`}>
      <p className="text-ui-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
        {label}
        {estimated ? (
          <span className="rounded px-1 py-0.5 text-[7px] bg-white/70 border border-slate-200/80">Est.</span>
        ) : null}
      </p>
      <p className="mt-1 text-xs font-bold leading-snug text-slate-900 truncate">{detail}</p>
    </div>
  );
}

/**
 * Five-pulse health strip — Sales section framing.
 */
export function ExecPulseBar({ pulses, formatNgn, loading }) {
  if (loading && !pulses) {
    return (
      <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden mb-6">
        <div className="h-1 bg-zarewa-teal" aria-hidden />
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  const p = pulses || {};
  return (
    <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden mb-6">
      <div className="h-1 bg-zarewa-teal" aria-hidden />
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <Activity size={14} className="text-zarewa-teal shrink-0" strokeWidth={2} />
        <p className="text-ui-xs font-semibold uppercase tracking-widest text-slate-500">Company pulses</p>
      </div>
      <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2" aria-label="Company pulses">
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
    </section>
  );
}
