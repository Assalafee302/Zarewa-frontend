import React from 'react';
import { formatNgn } from '../../Data/mockData';

export function PaymentExceptionQueuePanel({
  queue,
  openCount,
  closureNotes,
  onToggleClosed,
  onUpdateNote,
}) {
  return (
    <section className="z-soft-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-zarewa-teal tracking-tight">Payment exception queue</h3>
        <p className="text-xs font-semibold text-slate-500">
          Open {openCount} / Total {queue.length}
        </p>
      </div>
      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-3xl">
        Prioritize by severity, then delta and aging. Mark rows closed after reversal or re-post verification.
        Closure notes are saved in this browser only.
      </p>
      <div className="mt-4 space-y-3">
        {queue.length === 0 ? (
          <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
            No payment exceptions for the selected date range.
          </p>
        ) : (
          queue.slice(0, 12).map((row) => {
            const closure = closureNotes[row.key] || {};
            const closed = Boolean(closure.closed);
            return (
              <div
                key={row.key}
                className={`rounded-lg border p-3 ${closed ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/60'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">
                    {row.refId || '—'} · {row.bucket === 'quotation_ar' ? 'AR mismatch' : 'Receipt/Treasury'}
                  </p>
                  <p className="text-xs font-black text-rose-800">{formatNgn(Math.abs(Number(row.deltaNgn) || 0))}</p>
                </div>
                <p className="text-xs text-slate-700 mt-1">{row.issue}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {row.customer || '—'}
                  {row.quotationRef ? ` · ${row.quotationRef}` : ''} · Severity {row.severity}
                  {row.ageDays != null ? ` · ${row.ageDays} day(s)` : ''}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleClosed(row, !closed)}
                    className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                      closed
                        ? 'border-emerald-300 text-emerald-800 bg-emerald-100'
                        : 'border-rose-300 text-rose-800 bg-white'
                    }`}
                  >
                    {closed ? 'Closed' : 'Mark closed'}
                  </button>
                  <input
                    type="text"
                    value={closure.note || ''}
                    onChange={(e) => onUpdateNote(row, e.target.value)}
                    placeholder="Closure note (reversed, reposted, verified…)"
                    className="flex-1 min-w-[14rem] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
