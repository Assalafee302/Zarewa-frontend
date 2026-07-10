import React from 'react';

const TONE_BAR = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
};

/**
 * Slim status rail — one bar per category; click filters the Priority Action Center.
 * Replaces the old health strip that duplicated inbox badge counts.
 */
export function ManagerStatusRail({ signals = [], activeKey = null, onSelect }) {
  const max = Math.max(1, ...signals.map((s) => Number(s.count) || 0));

  if (!signals.length) return null;

  return (
    <section className="mb-4" aria-label="Queue status rail">
      <div className="flex items-end justify-between gap-2 mb-2">
        <h3 className="text-ui-xs font-black uppercase tracking-[0.16em] text-slate-500">Status rail</h3>
        <p className="text-ui-xs text-slate-400 hidden sm:block">Click a category to filter · counts shown once</p>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {signals.map((s) => {
          const count = Number(s.count) || 0;
          const pct = Math.max(count > 0 ? 12 : 4, Math.round((count / max) * 100));
          const active = activeKey === s.key;
          return (
            <button
              key={s.key}
              type="button"
              title={s.hint || s.label}
              onClick={() => onSelect?.(s.key)}
              className={`rounded-xl border px-2 py-2 text-left transition-colors ${
                active
                  ? 'border-zarewa-teal bg-teal-50/80 ring-1 ring-zarewa-teal/20'
                  : 'border-slate-200/80 bg-white hover:border-slate-300'
              }`}
            >
              <span className="block text-ui-xs font-bold uppercase tracking-wide text-slate-500 truncate">
                {s.label}
              </span>
              <span className="block text-sm font-black tabular-nums text-slate-900 mt-0.5">{count}</span>
              <span className="mt-1.5 block h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <span
                  className={`block h-full rounded-full ${TONE_BAR[s.tone] || TONE_BAR.green}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
