import React from 'react';
import { ChevronLeft } from 'lucide-react';

/**
 * Reading pane header for work items and conversation threads.
 */
export function WorkspaceReadingPaneHeader({ onBack, title, item = null, threadId = null }) {
  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-2 py-2.5 sm:px-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          aria-label="Back to inbox"
        >
          <ChevronLeft size={20} aria-hidden />
          <span className="hidden sm:inline">Back</span>
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{title || 'Work item'}</span>
      </div>
      {item ? (
        <div className="flex flex-wrap items-center gap-1.5 pl-1">
          <span className="font-mono text-[10px] text-slate-500">{item.referenceNo}</span>
          {item.categoryLabel ? (
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${item.categoryColorClass}`}>
              {item.categoryLabel}
            </span>
          ) : null}
          {item.branchLabel ? (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
              {item.branchLabel}
            </span>
          ) : null}
          {item.statusLabel ? (
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${item.statusToneClass}`}>
              {item.statusLabel}
            </span>
          ) : null}
          {item.actionLabel ? (
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200">
              {item.actionLabel}
            </span>
          ) : null}
        </div>
      ) : threadId ? (
        <p className="pl-1 text-[10px] font-mono text-slate-500">Thread {threadId}</p>
      ) : null}
    </div>
  );
}
