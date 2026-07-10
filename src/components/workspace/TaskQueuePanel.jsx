import React, { useMemo } from 'react';
import { ListEmptyState } from '../ui/ListEmptyState';
import { normalizeWorkItem } from '../../lib/workspaceWorkItemModel';
import { officeRecordStatusBadges, officeRecordNextActorLabel } from '../../lib/officeRecordStatus';
import {
  TASK_QUEUE_TABS,
  workItemMatchesTaskQueueTab,
  countTaskQueueTabs,
} from '../../lib/workspaceTaskQueue';
import { workItemShowsOnWorkspaceUnifiedInbox } from '../../lib/workItemPersonalInbox';

function TaskCard({ item, branchNames, onSelect }) {
  const n = normalizeWorkItem(item, { branchNames, userId: item._userId });
  const badges = officeRecordStatusBadges(item);
  return (
    <button
      type="button"
      data-work-item-row
      onClick={() => onSelect?.(item)}
      className="w-full rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-sm transition hover:border-teal-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 line-clamp-2">{n.title}</p>
        <span className={badges.primary.className}>{badges.primary.label}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {n.documentTypeLabel} · {n.branchLabel}
        {item.dueAtIso ? ` · Due ${n.formattedDate}` : ''}
      </p>
      {n.previewText ? <p className="mt-2 text-sm text-slate-600 line-clamp-2">{n.previewText}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {badges.secondary ? <span className={badges.secondary.className}>{badges.secondary.label}</span> : null}
        <span className="text-ui-xs font-medium text-slate-500">{officeRecordNextActorLabel(item)}</span>
      </div>
    </button>
  );
}

export default function TaskQueuePanel({ items, inboxCtx, activeTab, onTabChange, onSelectItem, emptyMessage }) {
  const branchNames = inboxCtx.branchNames || {};

  const visible = useMemo(
    () => items.filter((item) => workItemShowsOnWorkspaceUnifiedInbox(item, inboxCtx)),
    [items, inboxCtx]
  );

  const counts = useMemo(() => countTaskQueueTabs(visible, inboxCtx), [visible, inboxCtx]);

  const filtered = useMemo(
    () =>
      visible
        .filter((item) => workItemMatchesTaskQueueTab(item, activeTab, inboxCtx))
        .map((item) => ({ ...item, _userId: inboxCtx.userId })),
    [visible, activeTab, inboxCtx]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist">
        {TASK_QUEUE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange?.(tab.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
              activeTab === tab.id ? 'bg-white text-teal-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600'
            }`}
          >
            {tab.label}
            {counts[tab.id] > 0 ? (
              <span className="ml-1 rounded-full bg-teal-100 px-1.5 py-0.5 text-ui-xs text-teal-900">{counts[tab.id]}</span>
            ) : null}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <ListEmptyState
          title={emptyMessage || 'No items in this queue'}
          description="Switch tabs or check back when new work arrives."
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <TaskCard key={item.id} item={item} branchNames={branchNames} onSelect={onSelectItem} />
          ))}
        </div>
      )}
    </div>
  );
}
