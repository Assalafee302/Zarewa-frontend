import React from 'react';
import { X } from 'lucide-react';
import { officeRecordNextActorLabel, officeRecordStatusBadges } from '../../../lib/officeRecordStatus';
import { normalizeWorkItem } from '../../../lib/workspaceWorkItemModel';
import { wsPriorityBadge } from '../../../lib/workspaceUiTokens';

function slaTone(workItem) {
  const due = workItem?.dueAtIso ? Date.parse(workItem.dueAtIso) : NaN;
  if (!Number.isFinite(due)) return 'slate';
  const hours = (due - Date.now()) / 3600000;
  if (hours < 0) return 'red';
  if (hours < 24) return 'amber';
  return 'green';
}

const SLA_CLASS = {
  green: 'bg-green-50 text-green-900 ring-green-100',
  amber: 'bg-amber-50 text-amber-900 ring-amber-100',
  red: 'bg-red-50 text-red-800 ring-red-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
};

/**
 * Right context rail — people, SLA, linked work, quick actions.
 */
export default function ContextRail({
  workItem,
  room = null,
  presence = [],
  onClose,
  onApprove,
  onReject,
  onFile,
  onPinToRoom,
  onOpenOriginRoom,
  actionsBusy = false,
  fileBusy = false,
  children,
}) {
  const railBusy = Boolean(actionsBusy || fileBusy);
  if (!workItem && !room && !children) {
    return (
      <aside
        aria-label="Workspace context"
        className="hidden w-72 shrink-0 border-l border-slate-200 bg-slate-50/80 p-4 xl:block"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Context</p>
        <p className="mt-2 text-sm text-slate-600">Select a work item or room to see people, SLA, and linked ERP records.</p>
      </aside>
    );
  }

  const n = workItem ? normalizeWorkItem(workItem) : null;
  const badges = workItem ? officeRecordStatusBadges(workItem) : null;
  const tone = workItem ? slaTone(workItem) : 'slate';

  return (
    <aside aria-label="Workspace context" className="flex w-full shrink-0 flex-col border-l border-slate-200 bg-white xl:w-72">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Context</p>
        {onClose ? (
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 xl:hidden" aria-label="Close context">
            <X size={16} />
          </button>
        ) : null}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {room ? (
          <section>
            <h2 className="text-sm font-semibold text-slate-900">{room.name || room.slug}</h2>
            <p className="mt-1 text-xs text-slate-500">{room.description || 'Ops room'}</p>
          </section>
        ) : null}
        {n ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900 line-clamp-3">{n.title}</h2>
            <div className="flex flex-wrap gap-1.5">
              {badges?.primary ? <span className={badges.primary.className}>{badges.primary.label}</span> : null}
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${SLA_CLASS[tone]}`}>
                SLA {tone === 'red' ? 'overdue' : tone === 'amber' ? 'due soon' : tone === 'green' ? 'on track' : 'n/a'}
              </span>
              {workItem?.priority ? <span className={wsPriorityBadge(workItem.priority)}>{workItem.priority}</span> : null}
            </div>
            <p className="text-xs text-slate-600">Next: {officeRecordNextActorLabel(workItem)}</p>
            {workItem?.referenceNo ? (
              <p className="text-xs text-slate-500">Ref {workItem.referenceNo}</p>
            ) : null}
            {workItem?.filingNo || workItem?.filingReference || workItem?.data?.filingNo ? (
              <p className="text-xs text-slate-500">
                Filing {workItem.filingNo || workItem.filingReference || workItem.data?.filingNo}
              </p>
            ) : null}
            {workItem?.originRoomId || workItem?.data?.originRoomId ? (
              <button
                type="button"
                onClick={() => onOpenOriginRoom?.(workItem.originRoomId || workItem.data?.originRoomId)}
                className="text-xs font-semibold text-teal-800 hover:underline"
              >
                Open source chat
              </button>
            ) : null}
          </section>
        ) : null}
        {presence?.length ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">On desk</h3>
            <ul className="mt-2 space-y-1.5">
              {presence.slice(0, 12).map((p) => (
                <li key={p.userId} className="flex items-center gap-2 text-sm text-slate-800">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      p.status === 'online'
                        ? 'bg-green-500'
                        : p.status === 'busy'
                          ? 'bg-red-500'
                          : p.status === 'away'
                            ? 'bg-amber-400'
                            : 'bg-slate-300'
                    }`}
                    aria-hidden
                  />
                  {p.displayName || p.userId}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {workItem && (onApprove || onReject || onFile || (room && onPinToRoom)) ? (
          <section className="flex flex-col gap-2 border-t border-slate-100 pt-3">
            {onApprove ? (
              <button
                type="button"
                onClick={onApprove}
                disabled={railBusy}
                aria-label="Approve or endorse work item"
                className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
              >
                {railBusy ? 'Working…' : 'Approve'}
              </button>
            ) : null}
            {onReject ? (
              <button
                type="button"
                onClick={onReject}
                disabled={railBusy}
                aria-label="Reject or return work item"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Reject
              </button>
            ) : null}
            {onFile ? (
              <button
                type="button"
                onClick={onFile}
                disabled={railBusy}
                aria-label="File work item"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {fileBusy ? 'Filing…' : 'File'}
              </button>
            ) : null}
            {room && onPinToRoom ? (
              <button
                type="button"
                onClick={onPinToRoom}
                disabled={railBusy}
                className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-100 disabled:opacity-50"
              >
                Pin to chat
              </button>
            ) : null}
          </section>
        ) : null}
        {children}
      </div>
    </aside>
  );
}
