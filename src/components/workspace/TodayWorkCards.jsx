import React from 'react';
import { countTaskQueueTabs } from '../../lib/workspaceTaskQueue';

export default function TodayWorkCards({ counts, onNavigate }) {
  const cards = [
    { key: 'needs_action', label: 'Need your action', warn: true },
    { key: 'waiting', label: 'Waiting on others' },
    { key: 'returned', label: 'Returned to you' },
    { key: 'overdue', label: 'Overdue', warn: true },
    { key: 'completed', label: 'Completed this week' },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-5"
      role="group"
      aria-label="Today’s work counts"
    >
      {cards.map((c) => {
        const n = Number(counts?.[c.key] ?? 0);
        const warn = Boolean(c.warn && n > 0);
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onNavigate?.('tasks', c.key)}
            aria-label={`${n} ${c.label}`}
            className="bg-white p-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zarewa-teal"
          >
            <p className={`z-stencil text-2xl ${warn ? 'text-amber-900' : 'text-slate-900'}`}>{n}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700">{c.label}</p>
          </button>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTodayWorkCounts(items, inboxCtx) {
  return React.useMemo(() => countTaskQueueTabs(items, inboxCtx), [items, inboxCtx]);
}
