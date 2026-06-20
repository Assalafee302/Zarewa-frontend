import React from 'react';
import { Eye } from 'lucide-react';

/** Banner when MD / executive opens Accounting Desk without finance.post. */
export function AccountingDeskExecutiveNotice() {
  return (
    <div className="rounded-xl border border-violet-200/90 bg-violet-50/70 px-3 py-2.5 flex items-start gap-2">
      <Eye size={16} className="text-violet-800 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wide text-violet-950">Executive read-only</p>
        <p className="mt-0.5 text-[11px] text-violet-900/90 leading-snug">
          Review statements, close progress, and registers. Head of Accounts posts opening journals, runs policy cutover,
          and locks periods.
        </p>
      </div>
    </div>
  );
}
