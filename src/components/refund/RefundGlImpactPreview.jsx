import React from 'react';
import { BookOpen } from 'lucide-react';
import { refundGlImpactFromLines } from '../../lib/refundGlPreview';

/**
 * Read-only accounting impact summary for included refund breakdown lines.
 */
export function RefundGlImpactPreview({ calculationLines, hasCompletedProduction, className = '' }) {
  const rows = refundGlImpactFromLines(calculationLines, { hasCompletedProduction });
  if (rows.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-3 ${className}`}
      role="region"
      aria-label="Accounting impact preview"
    >
      <div className="flex items-center gap-2">
        <BookOpen size={16} className="text-[#134e4a] shrink-0" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Accounting impact (read-only)</p>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        Payout treasury entry is typically <span className="font-mono font-semibold">Dr 2500 · Cr 1000</span>. Lines
        below show category-specific review notes — not automatic journal postings.
      </p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.category}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-snug"
          >
            <p className="font-bold text-slate-800">{row.category}</p>
            <p className="font-mono text-[11px] text-[#134e4a] mt-0.5">{row.posting}</p>
            <p className="text-slate-600 mt-1">{row.note}</p>
            {row.revenueReview ? (
              <p className="text-amber-800 font-semibold mt-1 text-[11px]">Post-production — revenue review likely</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
