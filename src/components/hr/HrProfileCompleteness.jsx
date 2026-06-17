import React from 'react';
import { Link } from 'react-router-dom';
import { ProfileAccentBar } from '../profile/profileDesign';

const STATUS_CLS = {
  complete: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  partial: 'bg-amber-50 text-amber-900 border-amber-200',
  low: 'bg-red-50 text-red-800 border-red-200',
};

function barColor(pct) {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

/**
 * @param {{
 *   completeness?: { overallPct?: number; sections?: Array<{ id: string; label: string; pct: number; complete?: boolean; fixTab?: string }> };
 *   staffBasePath?: string;
 *   userId?: string;
 *   onFixSection?: (tabId: string) => void;
 *   compact?: boolean;
 * }} props
 */
export function HrProfileCompleteness({ completeness, staffBasePath, userId, onFixSection, compact = false }) {
  if (!completeness?.sections?.length) return null;
  const pct = completeness.overallPct ?? 0;
  const statusCls = pct >= 90 ? STATUS_CLS.complete : pct >= 60 ? STATUS_CLS.partial : STATUS_CLS.low;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <ProfileAccentBar />
      <div className={compact ? 'p-4' : 'p-5'}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Profile health</p>
            <p className={`mt-1 inline-flex rounded-md border px-2.5 py-0.5 text-sm font-black tabular-nums ${statusCls}`}>
              {pct}%
            </p>
          </div>
          {!compact && userId && staffBasePath ? (
            <Link
              to={`${staffBasePath}/${encodeURIComponent(userId)}?tab=documents`}
              className="text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:underline"
            >
              Fix missing items →
            </Link>
          ) : null}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all ${barColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <ul className={`mt-4 grid gap-2 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
          {completeness.sections.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/60 bg-white/70 px-3 py-2 text-xs"
            >
              <span className="font-semibold text-slate-700">{s.label}</span>
              <span className="flex items-center gap-2">
                <span className={`font-black tabular-nums ${s.pct >= 100 ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {s.pct}%
                </span>
                {s.pct < 100 && onFixSection && s.fixTab ? (
                  <button
                    type="button"
                    className="min-h-9 rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-teal-50"
                    onClick={() => onFixSection(s.fixTab)}
                  >
                    Fix
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
