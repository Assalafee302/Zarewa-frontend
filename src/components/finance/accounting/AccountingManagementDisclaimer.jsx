import React from 'react';
import { FileWarning } from 'lucide-react';

/** Shared disclaimer — GL statements are management draft, not statutory. */
export function AccountingManagementDisclaimer({ compact = false }) {
  if (compact) {
    return (
      <p className="text-ui-xs text-slate-500 leading-snug">
        <FileWarning size={12} className="inline mr-1 text-amber-600 align-text-bottom" />
        Management draft from GL — not statutory accounts. Use HoA adjustment workbook for board/tax filing until
        statutory pack is signed off.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 flex items-start gap-2">
      <FileWarning size={16} className="text-amber-700 shrink-0 mt-0.5" />
      <div className="min-w-0 text-xs text-slate-700 leading-snug">
        <p className="font-bold text-slate-800">Management draft — not statutory</p>
        <p className="mt-0.5">
          Figures come from operational registers and GL postings. Sales dashboard KPIs may use quotation-date or proxy
          bases — for official P&amp;L use <strong>Reports → Statements</strong> only. Tax, provisions, and audit
          adjustments remain Head of Accounts responsibility until a statutory pack is defined.
        </p>
      </div>
    </div>
  );
}
