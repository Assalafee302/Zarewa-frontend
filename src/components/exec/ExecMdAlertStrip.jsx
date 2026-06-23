import React from 'react';
import { Bell, ChevronRight } from 'lucide-react';

/**
 * Mobile alert strip — surfaces MD-only queue count; opens Decide tab in-place (no separate route).
 */
export function ExecMdAlertStrip({ mdOnlyCount = 0, activeTab, onOpenDecide }) {
  if (!mdOnlyCount || activeTab === 'decide') return null;

  return (
    <div className="mb-4 lg:hidden" role="status" aria-label="Executive alerts">
      <button
        type="button"
        onClick={() => onOpenDecide?.()}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/90 px-4 py-3 text-left shadow-sm transition-colors hover:bg-violet-50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Bell size={14} className="shrink-0 text-violet-700" aria-hidden />
          <span className="text-[11px] font-semibold text-violet-950">
            {mdOnlyCount} item{mdOnlyCount === 1 ? '' : 's'} need your sign-off
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase text-[#134e4a]">
          Decide
          <ChevronRight size={14} />
        </span>
      </button>
    </div>
  );
}
