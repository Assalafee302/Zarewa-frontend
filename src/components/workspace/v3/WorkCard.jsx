import React from 'react';
import { Pin } from 'lucide-react';
import { wsStatusBadge } from '../../../lib/workspaceUiTokens';

/**
 * ERP work card pinned in a room or shown in context.
 */
export default function WorkCard({
  title,
  subtitle,
  kind,
  status,
  onOpen,
  pinned,
}) {
  const label = title || 'Work item';

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${label}${status ? `, ${status}` : ''}`}
      className="flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm hover:border-teal-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
    >
      {pinned ? <Pin size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden /> : null}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{label}</p>
        {subtitle ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{subtitle}</p> : null}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {kind ? (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">{kind}</span>
          ) : null}
          {status ? <span className={wsStatusBadge(status)}>{status}</span> : null}
        </div>
      </div>
    </button>
  );
}
