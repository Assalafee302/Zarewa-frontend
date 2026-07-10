import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * Shared empty state for list panels, tables, and inbox views.
 */
export function ListEmptyState({
  title = 'Nothing here yet',
  description,
  icon: Icon = Inbox,
  action,
  className = '',
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center ${className}`}
      role="status"
    >
      {Icon ? (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/80">
          <Icon size={22} strokeWidth={1.75} aria-hidden />
        </div>
      ) : null}
      <p className="text-sm font-bold text-slate-800">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
