import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { refundGlImpactFromLines } from '../../lib/refundGlPreview';

/**
 * Read-only accounting impact summary for included refund breakdown lines.
 * Collapsed by default so create flow stays focused on amount + payee.
 */
export function RefundGlImpactPreview({ calculationLines, hasCompletedProduction, className = '' }) {
  const rows = refundGlImpactFromLines(calculationLines, { hasCompletedProduction });
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/90 ${className}`}
      role="region"
      aria-label="Accounting impact preview"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
        <BookOpen size={14} className="text-zarewa-teal shrink-0" aria-hidden />
        <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-600">
          Accounting notes ({rows.length})
        </span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-slate-200 px-3 pb-3 pt-2">
          <p className="text-ui-xs text-slate-500 leading-snug">
            Typical payout: <span className="font-mono font-semibold">Dr 2500 · Cr 1000</span>. Not automatic journals.
          </p>
          <ul className="space-y-1.5">
            {rows.map((row) => (
              <li
                key={row.category}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs leading-snug"
              >
                <p className="font-bold text-slate-800">{row.category}</p>
                <p className="font-mono text-zarewa-teal mt-0.5">{row.posting}</p>
                <p className="text-slate-600 mt-0.5">{row.note}</p>
                {row.revenueReview ? (
                  <p className="text-amber-800 font-semibold mt-0.5">Post-production — revenue review likely</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
