import React from 'react';
import { countTaskQueueTabs } from '../../lib/workspaceTaskQueue';

export default function TodayWorkCards({ counts, onNavigate }) {
  const cards = [
    { key: 'needs_action', label: 'Need your action', tone: 'border-amber-200 bg-amber-50' },
    { key: 'waiting', label: 'Waiting on others', tone: 'border-slate-200 bg-slate-50' },
    { key: 'returned', label: 'Returned to you', tone: 'border-sky-200 bg-sky-50' },
    { key: 'overdue', label: 'Overdue', tone: 'border-rose-200 bg-rose-50' },
    { key: 'completed', label: 'Completed this week', tone: 'border-emerald-200 bg-emerald-50' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onNavigate?.('tasks', c.key)}
          className={`rounded-xl border p-3 text-left ${c.tone} hover:shadow-sm`}
        >
          <p className="text-2xl font-bold text-slate-900">{counts?.[c.key] ?? 0}</p>
          <p className="mt-1 text-xs font-semibold text-slate-700">{c.label}</p>
        </button>
      ))}
    </div>
  );
}

export function useTodayWorkCounts(items, inboxCtx) {
  return React.useMemo(() => countTaskQueueTabs(items, inboxCtx), [items, inboxCtx]);
}
