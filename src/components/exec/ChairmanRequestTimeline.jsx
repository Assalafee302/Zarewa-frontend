import React from 'react';
import { formatNgn } from '../../shared/lib/formatNgn.js';

function formatWhen(iso) {
  const raw = String(iso || '').trim();
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 16).replace('T', ' ');
  return d.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function kindClass(kind) {
  const k = String(kind || '').toLowerCase();
  if (k === 'approved' || k === 'paid') return 'border-emerald-200 bg-emerald-50';
  if (k === 'rejected' || k === 'cancelled') return 'border-rose-200 bg-rose-50';
  if (k === 'repayment') return 'border-teal-200 bg-teal-50';
  return 'border-slate-200 bg-white';
}

/**
 * Who did what, how they approved or paid, and any note — for drawings and loans.
 */
export function ChairmanRequestTimeline({ events = [], empty = 'No activity recorded yet.' }) {
  const list = Array.isArray(events) ? events : [];
  if (!list.length) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }

  return (
    <ol className="space-y-2 border-l-2 border-slate-200 pl-4">
      {list.map((ev) => (
        <li key={ev.id || `${ev.kind}-${ev.atIso}`} className={`rounded-md border px-3 py-2 ${kindClass(ev.kind)}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{ev.title || ev.kind || 'Event'}</p>
            {ev.amountNgn ? (
              <p className="z-stencil text-sm tabular-nums text-slate-800">{formatNgn(ev.amountNgn)}</p>
            ) : null}
          </div>
          <p className="mt-0.5 text-ui-xs text-slate-600">
            {ev.actorName ? <span className="font-semibold">{ev.actorName}</span> : <span>System</span>}
            {ev.atIso ? <> · {formatWhen(ev.atIso)}</> : null}
          </p>
          {ev.how ? <p className="mt-1 text-sm leading-snug text-slate-700">{ev.how}</p> : null}
          {ev.note ? <p className="mt-1 text-ui-xs text-slate-500">{ev.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
