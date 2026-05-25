import React from 'react';
import { officeThreadIdFromWorkItem } from '../../lib/officeThreadFromWorkItem';
import { workItemShowsOfficeDrawerTransactionIntel } from '../../lib/transactionIntelFromWorkItem';

/**
 * Enhanced work item row for the Workspace Inbox.
 * @param {{ item: import('../../lib/workspaceWorkItemModel.js').normalizeWorkItem extends Function ? ReturnType<import('../../lib/workspaceWorkItemModel.js').normalizeWorkItem> : object, selected?: boolean, onActivate: (item: object) => void }}
 */
export default function WorkItemRow({
  item,
  selected = false,
  onActivate,
  selectable = false,
  checked = false,
  onToggleSelect,
}) {
  const tid = officeThreadIdFromWorkItem(item);
  const isIntel = workItemShowsOfficeDrawerTransactionIntel(item.documentType);

  return (
    <li>
      <button
        type="button"
        onClick={() => onActivate(item)}
        className={`flex w-full items-start gap-3 px-3 py-3.5 text-left transition-colors md:gap-4 md:px-4 ${
          selected ? 'bg-teal-50 ring-1 ring-inset ring-teal-100/90' : 'hover:bg-slate-50'
        }`}
      >
        {selectable ? (
          <input
            type="checkbox"
            checked={checked}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect?.()}
            className="mt-1 rounded border-slate-300 text-teal-800"
            aria-label={`Select ${item.title}`}
          />
        ) : null}
        <div className="mt-0.5 flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">{item.title}</span>
            {item.formattedDate ? (
              <span className="shrink-0 text-xs tabular-nums text-slate-500">{item.formattedDate}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${item.categoryColorClass || 'bg-slate-50 text-slate-700 ring-slate-100'}`}
            >
              {item.categoryLabel}
            </span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${item.statusToneClass}`}>
              {item.statusLabel}
            </span>
            {item.actionLabel ? (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200">
                {item.actionLabel}
              </span>
            ) : null}
            {item.isOverdue ? (
              <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 ring-1 ring-rose-200">
                Overdue
              </span>
            ) : null}
            {(item.priority === 'high' || item.priority === 'urgent') && (
              <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-100">
                {item.priority === 'urgent' ? 'Urgent' : 'High'}
              </span>
            )}
          </div>

          <p className="line-clamp-2 text-[12px] leading-snug text-slate-600">
            <span className="font-mono text-[11px] text-slate-500">{item.referenceNo}</span>
            <span className="text-slate-300"> · </span>
            <span>{item.branchLabel}</span>
            <span className="text-slate-300"> · </span>
            <span>{item.responsibleOffice}</span>
            {item.senderName ? (
              <>
                <span className="text-slate-300"> · </span>
                <span>{item.senderName}</span>
              </>
            ) : null}
          </p>

          {item.previewText ? (
            <p className="line-clamp-2 text-[12px] leading-snug text-slate-500">{item.previewText}</p>
          ) : null}

          {tid && !isIntel ? (
            <p className="text-[10px] font-medium uppercase tracking-wide text-teal-700">Conversation thread</p>
          ) : null}
        </div>
      </button>
    </li>
  );
}
