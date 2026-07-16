import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';

function downloadExceptionCsv(rows, filename) {
  const headers = [
    'refId',
    'bucket',
    'issue',
    'customer',
    'quotationRef',
    'severity',
    'ageDays',
    'deltaNgn',
  ];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.refId,
        row.bucket,
        row.issue,
        row.customer,
        row.quotationRef,
        row.severity,
        row.ageDays,
        row.deltaNgn,
      ]
        .map(escape)
        .join(',')
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PaymentExceptionQueuePanel({
  queue,
  openCount,
  closureNotes,
  onToggleClosed,
  onUpdateNote,
  onOpenCashBankExport,
}) {
  const [refreshedAt] = useState(() => new Date());
  const [tick, setTick] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 30000);
    return () => window.clearInterval(t);
  }, []);

  const ageLabel = (() => {
    void tick;
    const sec = Math.floor((Date.now() - refreshedAt.getTime()) / 1000);
    if (sec < 60) return 'just now';
    return `${Math.floor(sec / 60)}m ago`;
  })();

  const openRows = useMemo(
    () => queue.filter((row) => !closureNotes[row.key]?.closed),
    [queue, closureNotes]
  );

  const visible = showAll ? queue : queue.slice(0, 12);

  return (
    <section className="z-soft-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-zarewa-teal tracking-tight">Payment exception queue</h3>
        <p className="text-xs font-semibold text-slate-500">
          Open {openCount} / Total {queue.length} · Loaded {ageLabel}
        </p>
      </div>
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 leading-relaxed">
        <strong>Local checklist only.</strong> Marking closed and notes are stored in this browser — they are not a
        company system of record and will not sync to other users. Export the open queue or download Cash, bank &amp; AR
        for the period before you rely on close.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="z-btn-secondary !text-xs !py-1.5"
          disabled={openRows.length === 0}
          onClick={() =>
            downloadExceptionCsv(openRows, `payment-exceptions-open-${new Date().toISOString().slice(0, 10)}.csv`)
          }
        >
          <Download size={14} />
          Export open queue (CSV)
        </button>
        {typeof onOpenCashBankExport === 'function' ? (
          <button type="button" className="z-btn-secondary !text-xs !py-1.5" onClick={onOpenCashBankExport}>
            Open Cash, bank &amp; AR export
          </button>
        ) : null}
        {queue.length > 12 ? (
          <button type="button" className="z-btn-secondary !text-xs !py-1.5" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show first 12' : `Show all ${queue.length}`}
          </button>
        ) : null}
      </div>
      <div className="mt-4 space-y-3">
        {queue.length === 0 ? (
          <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
            No payment exceptions for this period — you&apos;re clear.
          </p>
        ) : (
          visible.map((row) => {
            const closure = closureNotes[row.key] || {};
            const closed = Boolean(closure.closed);
            return (
              <div
                key={row.key}
                className={`rounded-lg border p-3 ${closed ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/60'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800">
                    {row.refId || '—'} · {row.bucket === 'quotation_ar' ? 'AR mismatch' : 'Receipt/Treasury'}
                  </p>
                  <p className="text-xs font-bold text-rose-800">{formatNgn(Math.abs(Number(row.deltaNgn) || 0))}</p>
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
                    className={`rounded-md border px-2 py-1 text-xs font-semibold min-h-9 ${
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
                    placeholder="Local note only (reversed, reposted, verified…)"
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
