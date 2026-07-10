import React from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

const STATUS_TONE = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  red: 'border-rose-200 bg-rose-50 text-rose-950',
};

export function ExecMdSupplyPanel({ inventory, coilPulse, onOpenDeepDive, busy }) {
  const buyNext = inventory?.lowStockHighDemand || [];
  const recommendations = inventory?.recommendations || [];
  const coilWeeks = coilPulse?.weeksCover;
  const coilTone = STATUS_TONE[coilPulse?.status] || STATUS_TONE.amber;

  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="h-1 bg-zarewa-teal" aria-hidden />
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
            <Package size={12} /> Supply
          </p>
          <h3 className="text-sm font-bold text-zarewa-teal">Coil &amp; buy decisions</h3>
        </div>
        <span className={`rounded-md px-2 py-0.5 text-ui-xs font-black ring-1 ${coilTone}`}>
          {busy && !coilPulse ? '…' : coilWeeks != null ? `${coilWeeks} wks cover` : coilPulse?.label || 'Coil'}
        </span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {buyNext.length === 0 && recommendations.length === 0 ? (
          <p className="text-xs text-slate-500">No urgent coil buy signals for this period.</p>
        ) : (
          <ul className="space-y-2">
            {(buyNext.length ? buyNext : recommendations).slice(0, 4).map((row, i) => (
              <li key={`${row.gauge}-${row.colour}-${i}`} className="text-xs text-slate-700">
                <span className="font-bold text-zarewa-teal capitalize">{row.family || row.type || 'Coil'}</span>
                {row.gauge ? ` · ${row.gauge} ${row.colour || ''}` : null}
                {row.weeksCover != null ? ` · ${row.weeksCover} wks` : null}
                {row.reason ? ` — ${row.reason}` : row.message ? ` — ${row.message}` : null}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-3 pt-1">
          <Link to="/procurement" className="text-ui-xs font-bold uppercase text-zarewa-teal hover:underline">
            Procurement desk
          </Link>
          {onOpenDeepDive ? (
            <button
              type="button"
              onClick={onOpenDeepDive}
              className="text-ui-xs font-bold uppercase text-slate-600 hover:text-zarewa-teal"
            >
              Coil intelligence
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
