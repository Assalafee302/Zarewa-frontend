import React from 'react';
import { Bell, ChevronRight } from 'lucide-react';

/**
 * Mobile alert strip — MD-only queue count; opens Approvals in-place.
 */
export function ExecMdAlertStrip({ mdOnlyCount = 0, activeTab, onOpenDecide }) {
  if (!mdOnlyCount || activeTab === 'decide') return null;

  return (
    <div className="mb-4 lg:hidden" role="status" aria-label="Executive alerts">
      <button
        type="button"
        onClick={() => onOpenDecide?.()}
        className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Bell size={14} className="shrink-0 text-slate-600" aria-hidden />
          <span className="text-sm font-semibold text-slate-900">
            {mdOnlyCount} item{mdOnlyCount === 1 ? '' : 's'} need your sign-off
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-zarewa-teal">
          Approvals
          <ChevronRight size={14} aria-hidden />
        </span>
      </button>
    </div>
  );
}
