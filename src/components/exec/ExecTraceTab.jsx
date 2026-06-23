import React from 'react';
import { CheckCircle2, RefreshCw, Shuffle, AlertTriangle } from 'lucide-react';

const OUTCOME_CHIP = {
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  partial: 'border-sky-200 bg-sky-50 text-sky-900',
  exception: 'border-rose-200 bg-rose-50 text-rose-900',
};

function TraceStoryCard({ sample, formatNgn, onOpenRef }) {
  const outcome = sample.outcome || 'partial';
  return (
    <article className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="h-1 bg-[#134e4a]" aria-hidden />
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {sample.domainLabel || sample.domain}
          </p>
          <h3 className="text-base font-bold text-[#134e4a] truncate">{sample.title}</h3>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {sample.subtitle}
            {sample.branchName ? ` · ${sample.branchName}` : ''}
            {sample.amountNgn != null ? ` · ${formatNgn(sample.amountNgn)}` : ''}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-black uppercase ring-1 ${OUTCOME_CHIP[outcome] || OUTCOME_CHIP.partial}`}
        >
          {outcome === 'complete' ? <CheckCircle2 size={12} /> : null}
          {outcome === 'exception' ? <AlertTriangle size={12} /> : null}
          {outcome}
        </span>
      </div>
      <ol className="px-4 sm:px-5 py-4 space-y-3">
        {(sample.timeline || []).map((t, i) => (
          <li key={i} className="flex gap-3 text-[11px]">
            <span className="shrink-0 w-28 font-black uppercase text-[9px] text-slate-500 leading-snug">
              {t.step}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800">{t.detail}</p>
              {t.atIso ? <p className="text-[10px] text-slate-500 mt-0.5">{t.atIso.slice(0, 16)}</p> : null}
              {t.docRef ? (
                <button
                  type="button"
                  onClick={() => onOpenRef?.(sample.domain, t.docRef)}
                  className="mt-1 text-[10px] font-bold text-[#134e4a] hover:underline"
                >
                  Open {t.docRef}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function ExecTraceTab({ data, busy, err, formatNgn, onReload, onShuffle, onOpenRef }) {
  const samples = data?.samples || [];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-[#134e4a]">MD Trace</p>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {data?.dateISO ? `Daily sample · ${data.dateISO}` : 'Stratified A→Z stories'}
            {data?.seedLabel === 'shuffled' ? ' · shuffled' : ''}
            {data?.sampleCount != null ? ` · ${data.sampleCount} domains` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReload}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onShuffle}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:brightness-105 disabled:opacity-50"
          >
            <Shuffle size={12} />
            Shuffle sample
          </button>
        </div>
      </div>

      {err ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{err}</p>
      ) : null}

      {busy && !data ? (
        <p className="text-sm text-slate-500 py-8 text-center">Loading trace samples…</p>
      ) : null}

      {!busy && samples.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No trace samples available for this branch yet — need recent transactions in each domain.
        </p>
      ) : (
        <div className="space-y-4">
          {samples.map((s) => (
            <TraceStoryCard key={`${s.domain}:${s.entityRef}`} sample={s} formatNgn={formatNgn} onOpenRef={onOpenRef} />
          ))}
        </div>
      )}

      {(data?.notes || []).length ? (
        <ul className="text-[10px] text-slate-500 space-y-1 list-disc pl-4">
          {data.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
