import React from 'react';
import { OT_STATUS_LABELS, otStatusChipClass } from '../../lib/otConstants';

export function OtStatusChip({ status }) {
  const s = String(status || '');
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-ui-xs font-bold uppercase tracking-wide ${otStatusChipClass(s)}`}
    >
      {OT_STATUS_LABELS[s] || s || '—'}
    </span>
  );
}

export function OtStatusTimeline({ history = [] }) {
  const rows = Array.isArray(history) ? history : [];
  if (!rows.length) {
    return <p className="text-xs text-slate-500">No status history yet.</p>;
  }
  return (
    <ol className="space-y-2 border-l-2 border-slate-200 pl-3">
      {rows.map((h) => (
        <li key={h.id || `${h.atIso}-${h.toStatus}`} className="relative">
          <span className="absolute -left-[0.91rem] top-1.5 h-2 w-2 rounded-full bg-zarewa-teal ring-2 ring-white" />
          <div className="flex flex-wrap items-center gap-2">
            <OtStatusChip status={h.toStatus} />
            <span className="text-[10px] tabular-nums text-slate-400">
              {h.atIso ? new Date(h.atIso).toLocaleString() : ''}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-semibold text-slate-700">
            {h.actorName || h.actorUserId || 'System'}
            {h.actorRole ? ` · ${h.actorRole}` : ''}
          </p>
          {h.note ? <p className="text-ui-xs text-slate-500">{h.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
