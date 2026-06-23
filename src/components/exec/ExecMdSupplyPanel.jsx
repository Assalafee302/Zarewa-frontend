import React from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

const STATUS_TONE = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  red: 'border-rose-200 bg-rose-50 text-rose-950',
};

export function ExecMdSupplyPanel({ inventory, coilPulse, onOpenIntelligence, busy }) {
  const buyNext = inventory?.lowStockHighDemand || [];
  const recommendations = inventory?.recommendations || [];
  const coilWeeks = coilPulse?.weeksCover;
  const coilTone = STATUS_TONE[coilPulse?.status] || STATUS_TONE.amber;

  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="h-1 bg-[#134e4a]" aria-hidden />
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
            <Package size={12} /> Supply
          </p>
          <h3 className="text-sm font-bold text-[#134e4a]">Coil &amp; buy decisions</h3>
        </div>
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ring-1 ${coilTone}`}>
          {busy && !coilPulse ? '…' : coilWeeks != null ? `${coilWeeks} wks cover` : coilPulse?.label || 'Coil'}
        </span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {buyNext.length === 0 && recommendations.length === 0 ? (
          <p className="text-[11px] text-slate-500">No urgent coil buy signals for this period.</p>
        ) : (
          <ul className="space-y-2">
            {(buyNext.length ? buyNext : recommendations).slice(0, 4).map((row, i) => (
              <li key={`${row.gauge}-${row.colour}-${i}`} className="text-[11px] text-slate-700">
                <span className="font-bold text-[#134e4a] capitalize">{row.family || row.type || 'Coil'}</span>
                {row.gauge ? ` · ${row.gauge} ${row.colour || ''}` : null}
                {row.weeksCover != null ? ` · ${row.weeksCover} wks` : null}
                {row.reason ? ` — ${row.reason}` : row.message ? ` — ${row.message}` : null}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-3 pt-1">
          <Link to="/procurement" className="text-[10px] font-bold uppercase text-[#134e4a] hover:underline">
            Procurement desk
          </Link>
          {onOpenIntelligence ? (
            <button
              type="button"
              onClick={onOpenIntelligence}
              className="text-[10px] font-bold uppercase text-slate-600 hover:text-[#134e4a]"
            >
              Coil intelligence
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
