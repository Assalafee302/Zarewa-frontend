import React from 'react';

export function IntelPanel({ title, hint, children, className = '', compact = false }) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${
        compact ? '' : 'min-h-0'
      } ${className}`}
    >
      <header className="shrink-0 border-b border-slate-100 bg-slate-50/90 px-3 py-2">
        <h4 className="text-ui-xs font-black uppercase tracking-widest text-zarewa-teal">{title}</h4>
        {hint ? <p className="mt-0.5 text-ui-xs leading-snug text-slate-500">{hint}</p> : null}
      </header>
      <div className="custom-scrollbar flex-1 overflow-y-auto p-3 text-xs text-slate-800">{children}</div>
    </section>
  );
}

/** Who/when line under the section it belongs to. */
export function SectionActorFooter({ lines, className = '' }) {
  const list = (Array.isArray(lines) ? lines : [lines]).map((x) => String(x || '').trim()).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className={`mt-2 space-y-0.5 border-t border-slate-100 pt-2 ${className}`}>
      {list.map((line) => (
        <p key={line} className="text-ui-xs leading-snug text-slate-500">
          {line}
        </p>
      ))}
    </div>
  );
}

/**
 * Compressed official record + decision state (one container).
 */
export function CaseStrip({
  recordRef,
  recordMeta,
  summary,
  status,
  chips,
  stats,
  actors,
  children,
  aside,
  onOpenRecord,
  openRecordLabel = 'Open record',
}) {
  return (
    <div className="rounded-xl border border-l-4 border-slate-200 border-l-zarewa-teal bg-white px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {recordRef ? (
              <p className="font-mono text-xs font-bold text-slate-900">{recordRef}</p>
            ) : null}
            {status ? (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-ui-xs font-black uppercase text-slate-700">
                {status}
              </span>
            ) : null}
            {chips}
          </div>
          {recordMeta ? <p className="mt-0.5 text-ui-xs capitalize text-slate-500">{recordMeta}</p> : null}
          {summary ? <p className="mt-1 line-clamp-2 text-ui-xs leading-snug text-slate-600">{summary}</p> : null}
          {children}
          <SectionActorFooter lines={actors} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {stats}
          {aside}
          {onOpenRecord ? (
            <button
              type="button"
              onClick={onOpenRecord}
              className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-ui-xs font-black uppercase tracking-wide text-zarewa-teal hover:bg-teal-100"
            >
              {openRecordLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function IntelStat({ label, value, accent }) {
  return (
    <div
      className={`rounded-lg border px-2 py-1.5 ${accent ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/80'}`}
    >
      <p className="text-ui-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export function IntelDetailRow({ label, value, mono }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 border-b border-slate-100 py-1.5 last:border-0">
      <span className="shrink-0 text-ui-xs font-semibold text-slate-500">{label}</span>
      <span className={`min-w-0 text-right text-xs font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
