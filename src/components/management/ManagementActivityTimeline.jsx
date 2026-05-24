import React from 'react';

function auditUi(appearance) {
  const L = appearance === 'light';
  return {
    sec: L ? 'mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500' : 'mb-2 text-[10px] font-black uppercase tracking-widest text-white/40',
    row: L ? 'rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-[11px]' : 'rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px]',
    when: L ? 'text-[9px] text-slate-400 tabular-nums' : 'text-[9px] text-white/30 tabular-nums',
    action: L ? 'font-bold text-slate-900' : 'font-bold text-white',
    meta: L ? 'text-slate-600' : 'text-white/55',
    empty: L ? 'text-xs text-slate-500' : 'text-xs text-white/35',
  };
}

/**
 * Unified who-did-what timeline from audit log, approvals, ledger, and edit tokens.
 */
export function ManagementActivityTimeline({ events = [], appearance = 'dark', formatNgn }) {
  const u = auditUi(appearance);
  const list = Array.isArray(events) ? events : [];
  if (!list.length) {
    return <p className={u.empty}>No activity recorded for this record yet.</p>;
  }

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
      {list.map((ev, idx) => (
        <div key={`${ev.kind}-${ev.atIso}-${ev.action}-${idx}`} className={u.row}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className={u.action}>
              {String(ev.action || ev.kind || 'event').replace(/_/g, ' ')}
            </span>
            <span className={u.when}>{ev.atIso ? String(ev.atIso).slice(0, 19).replace('T', ' ') : '—'}</span>
          </div>
          <p className={`mt-0.5 ${u.meta}`}>
            {ev.actor ? <span className="font-semibold">{ev.actor}</span> : null}
            {ev.actor && ev.status ? ' · ' : null}
            {ev.status ? <span>{ev.status}</span> : null}
            {ev.amountNgn != null && formatNgn ? (
              <>
                {' · '}
                <span className="tabular-nums font-bold">{formatNgn(ev.amountNgn)}</span>
              </>
            ) : null}
          </p>
          {ev.note ? <p className={`mt-1 text-[10px] leading-snug ${u.meta}`}>{ev.note}</p> : null}
        </div>
      ))}
    </div>
  );
}
