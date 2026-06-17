import React from 'react';
import { Link } from 'react-router-dom';

const STATUS_CLS = {
  complete: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-amber-100 text-amber-900',
  low: 'bg-red-100 text-red-800',
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
export function HrProfileCompleteness({ completeness, staffBasePath, userId, onFixSection, compact = false, embedded = false }) {
  if (!completeness?.sections?.length) return null;
  const pct = completeness.overallPct ?? 0;
  const statusCls = pct >= 90 ? STATUS_CLS.complete : pct >= 60 ? STATUS_CLS.partial : STATUS_CLS.low;

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {!embedded ? <p className="text-xs font-semibold text-slate-500">Profile health</p> : null}
          <p className={`${embedded ? 'text-2xl' : 'mt-1 text-lg'} inline-flex rounded-full px-3 py-0.5 font-black tabular-nums ${statusCls}`}>
            {pct}%
          </p>
        </div>
        {!compact && !embedded && userId && staffBasePath ? (
          <Link
            to={`${staffBasePath}/${encodeURIComponent(userId)}?tab=documents`}
            className="text-xs font-semibold text-[#134e4a] hover:underline"
          >
            Fix missing items →
          </Link>
        ) : null}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${barColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <ul className={`mt-4 space-y-1 ${compact ? '' : ''}`}>
        {completeness.sections.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-2 border-b border-slate-50 py-2 text-xs last:border-0"
          >
            <span className="font-medium text-slate-700">{s.label}</span>
            <span className="flex items-center gap-2">
              <span className={`font-bold tabular-nums ${s.pct >= 100 ? 'text-emerald-700' : 'text-slate-600'}`}>
                {s.pct}%
              </span>
              {s.pct < 100 && onFixSection && s.fixTab ? (
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-[10px] font-semibold text-[#134e4a] hover:bg-teal-50"
                  onClick={() => onFixSection(s.fixTab)}
                >
                  Fix
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </>
  );

  if (embedded) return body;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
      {body}
    </div>
  );
}
