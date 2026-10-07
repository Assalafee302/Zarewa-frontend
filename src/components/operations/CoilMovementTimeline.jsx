import React from 'react';
import { buildCoilTimeline } from '../../lib/coilExpectedLife';

function when(iso) {
  const s = String(iso || '').trim();
  if (!s) return '—';
  return s.length > 16 ? s.slice(0, 16).replace('T', ' ') : s;
}

export function CoilMovementTimeline({ coil, jobRows = [], movements = [] }) {
  const events = buildCoilTimeline({ coil, jobRows, movements });
  if (!events.length) {
    return <p className="text-xs text-slate-500">No movement rows for this coil yet.</p>;
  }
  return (
    <ol className="space-y-2" data-screen="coil-timeline">
      {events.map((ev) => (
        <li
          key={ev.id}
          className={`rounded-lg border px-3 py-2 text-xs ${
            ev.superseded ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          <p className={`font-bold text-zarewa-teal ${ev.superseded ? 'line-through text-slate-400' : ''}`}>
            {ev.title}
            <span className="ml-1 font-medium text-slate-400 no-underline">· {when(ev.atISO)}</span>
            {ev.superseded ? (
              <span className="ml-2 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 no-underline">
                Corrected
              </span>
            ) : null}
          </p>
          <p className={`mt-0.5 ${ev.superseded ? 'line-through' : ''}`}>{ev.detail}</p>
          <p className="mt-1 text-ui-xs text-slate-500">
            {ev.user || '—'}
            {ev.reason ? ` · ${ev.reason}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}
