import React from 'react';
import { Lock } from 'lucide-react';
import { officeThreadIdFromWorkItem } from '../../lib/officeThreadFromWorkItem';
import { workItemShowsOfficeDrawerTransactionIntel } from '../../lib/transactionIntelFromWorkItem';
import { wsBadge, wsPriorityBadge, wsStatusBadge } from '../../lib/workspaceUiTokens';

/**
 * Workspace inbox row — scannable ERP work item surface.
 */
export default function WorkItemRow({
  item,
  selected = false,
  onActivate,
  selectable = false,
  checked = false,
  onToggleSelect,
}) {
  const restricted = Boolean(item.redacted);
  const needsBold = Boolean(item.needsAction || item.unreadForCurrentUser);
  const tid = officeThreadIdFromWorkItem(item);
  const isIntel = workItemShowsOfficeDrawerTransactionIntel(item.documentType);
  const showPriority = item.priority === 'high' || item.priority === 'urgent';

  return (
    <li className="border-b border-slate-100 last:border-b-0">
      <div
        className={`group flex w-full items-stretch gap-0 text-left transition-colors ${
          selected ? 'bg-teal-50/80 ring-1 ring-inset ring-teal-100' : 'hover:bg-slate-50/90'
        }`}
      >
        {selectable ? (
          <label className="flex shrink-0 items-center px-3 py-4 md:px-4">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggleSelect?.()}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-slate-300 text-teal-800 focus:ring-teal-500"
              aria-label={`Select ${item.title}`}
            />
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => onActivate(item)}
          className={`min-w-0 flex-1 px-3 py-3.5 text-left md:px-4 md:py-4 ${selectable ? 'pl-0' : ''}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {restricted ? <Lock size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden /> : null}
              <span
                className={`line-clamp-2 text-[13px] leading-snug md:text-sm ${
                  needsBold ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'
                } ${restricted ? 'text-slate-600' : ''}`}
              >
                {item.title}
              </span>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-slate-500">{item.formattedDate}</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {showPriority ? (
              <span className={wsPriorityBadge(item.priority)}>
                {item.priority === 'urgent' ? 'Urgent' : 'Important'}
              </span>
            ) : null}
            <span className={wsStatusBadge(item.status)}>{item.statusLabel}</span>
            {item.isOverdue ? <span className={wsBadge('rose')}>Overdue</span> : null}
            {restricted ? <span className={wsBadge('restricted')}>Restricted</span> : null}
          </div>

          {!restricted ? (
            <p className="mt-1.5 line-clamp-1 text-xs text-slate-600 md:text-xs">
              <span className="font-mono text-slate-500">{item.referenceNo}</span>
              <span className="text-slate-300"> · </span>
              <span>{item.branchLabel}</span>
              <span className="text-slate-300"> · </span>
              <span>{item.categoryLabel}</span>
              <span className="text-slate-300"> · </span>
              <span>{item.responsibleOffice}</span>
              {item.senderName ? (
                <>
                  <span className="text-slate-300"> · </span>
                  <span>{item.senderName}</span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500 md:text-xs">
              You do not have permission to view this item.
            </p>
          )}

          {item.previewText && !restricted ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 md:text-xs">
              {item.previewText}
            </p>
          ) : null}

          {item.actionLabel ? (
            <p className="mt-1.5 text-ui-xs font-semibold uppercase tracking-wide text-amber-800">
              {item.actionLabel}
            </p>
          ) : null}

          {tid && !isIntel && !restricted ? (
            <p className="mt-1 text-ui-xs font-medium text-teal-800">Internal memo thread</p>
          ) : null}
        </button>
      </div>
    </li>
  );
}
