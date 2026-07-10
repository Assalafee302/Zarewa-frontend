import React, { useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { wsBadge, wsPriorityBadge, wsStatusBadge } from '../../lib/workspaceUiTokens';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { approvalBlockContextForWorkItem, userCanApproveWorkItem } from '../../lib/zareApprovalHints';

/**
 * Reading pane header for work items and conversation threads.
 */
export function WorkspaceReadingPaneHeader({
  onBack,
  title,
  item = null,
  threadId = null,
  workspaceCtx = null,
}) {
  const restricted = Boolean(item?.redacted);

  const approvalContext = useMemo(() => {
    if (!item?.requiresApproval || restricted || !workspaceCtx) return null;
    const base = approvalBlockContextForWorkItem(item, workspaceCtx);
    const canApprove = userCanApproveWorkItem(item, workspaceCtx);
    if (canApprove && !base.branchMismatch) return null;
    return { ...base, canApprove };
  }, [item, restricted, workspaceCtx]);

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          aria-label="Back to inbox"
        >
          <ChevronLeft size={20} aria-hidden />
          <span className="hidden sm:inline">Back to Inbox</span>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-base font-semibold text-slate-900 sm:text-lg">{title || 'Work item'}</h2>
          {item ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs text-slate-500">{item.referenceNo}</span>
              <span className={wsStatusBadge(item.status)}>{item.statusLabel}</span>
              {(item.priority === 'high' || item.priority === 'urgent') && !restricted ? (
                <span className={wsPriorityBadge(item.priority)}>
                  {item.priority === 'urgent' ? 'Urgent' : 'Important'}
                </span>
              ) : null}
              {restricted ? <span className={wsBadge('restricted')}>Restricted</span> : null}
            </div>
          ) : threadId ? (
            <p className="mt-1 font-mono text-xs text-slate-500">Thread {threadId}</p>
          ) : null}
        </div>
      </div>

      {item && !restricted ? (
        <div className="rounded-lg border border-slate-200/90 bg-slate-50/60 px-3 py-2.5 text-xs text-slate-700 sm:text-xs">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {item.branchLabel ? (
              <>
                <dt className="text-slate-500">Branch</dt>
                <dd className="font-medium text-slate-800">{item.branchLabel}</dd>
              </>
            ) : null}
            {item.categoryLabel ? (
              <>
                <dt className="text-slate-500">Category</dt>
                <dd className="font-medium text-slate-800">{item.categoryLabel}</dd>
              </>
            ) : null}
            {item.responsibleOffice ? (
              <>
                <dt className="text-slate-500">Responsible office</dt>
                <dd className="font-medium text-slate-800">{item.responsibleOffice}</dd>
              </>
            ) : null}
            {item.senderName ? (
              <>
                <dt className="text-slate-500">Sender</dt>
                <dd className="font-medium text-slate-800">{item.senderName}</dd>
              </>
            ) : null}
            {item.formattedDate ? (
              <>
                <dt className="text-slate-500">Updated</dt>
                <dd className="font-medium text-slate-800">{item.formattedDate}</dd>
              </>
            ) : null}
            {item.dueDateLabel ? (
              <>
                <dt className="text-slate-500">Due date</dt>
                <dd className={`font-medium ${item.isOverdue ? 'text-rose-800' : 'text-slate-800'}`}>
                  {item.dueDateLabel}
                </dd>
              </>
            ) : null}
          </dl>
          {item.actionLabel ? (
            <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-ui-xs font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-amber-100">
              {item.actionLabel}
            </p>
          ) : null}
          {approvalContext ? <ZareApprovalHint context={approvalContext} className="mt-2" /> : null}
        </div>
      ) : restricted ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          This item is restricted. You do not have permission to view its details.
        </p>
      ) : null}
    </div>
  );
}
