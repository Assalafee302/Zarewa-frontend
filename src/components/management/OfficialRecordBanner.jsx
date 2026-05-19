import React from 'react';

/**
 * Work-item filing banner for Management intel modals (clearance, refund, conversion).
 */
export function OfficialRecordBanner({
  item,
  light = false,
  quoteFallbackId = '',
  onOpenRecord,
  showOpenRecord = false,
}) {
  const shell = light
    ? 'rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'
    : 'rounded-2xl border border-white/15 bg-white/[0.07] p-3';
  const titleCls = light
    ? 'text-[10px] font-black uppercase tracking-widest text-[#134e4a]'
    : 'text-[10px] font-black uppercase tracking-widest text-teal-300/90';
  const refCls = light ? 'text-xs font-mono font-bold text-slate-900' : 'text-xs font-mono font-bold text-white';
  const metaCls = light ? 'text-[10px] text-slate-500 mt-1 capitalize' : 'text-[10px] text-white/50 mt-1 capitalize';
  const summaryCls = light
    ? 'text-[10px] text-teal-900 mt-2 line-clamp-2'
    : 'text-[10px] text-teal-100/85 mt-2 line-clamp-2';
  const btnCls = light
    ? 'shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-[#134e4a] hover:bg-teal-100'
    : 'shrink-0 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-white hover:bg-white/15';
  const bodyMuted = light ? 'text-slate-600' : 'text-white/55';

  if (!item) {
    const qid = String(quoteFallbackId || '').trim();
    if (!qid) return null;
    return (
      <div className={shell}>
        <p className={titleCls}>Official record</p>
        <p className={`mt-2 text-[11px] leading-snug ${bodyMuted}`}>
          Filing reference for <span className="font-mono font-bold">{qid}</span> is not in your workspace inbox
          yet. Refresh the page, or open the record in Sales / Office while you complete review.
        </p>
      </div>
    );
  }

  const showOpen = Boolean(onOpenRecord && (showOpenRecord || item.routePath || item.id));

  return (
    <div className={shell}>
      <p className={titleCls}>Official record</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={refCls}>{item.referenceNo || item.id}</p>
          <p className={metaCls}>
            {item.documentClass} · {String(item.documentType || '').replace(/_/g, ' ')}
          </p>
          {item.keyDecisionSummary ? <p className={summaryCls}>{item.keyDecisionSummary}</p> : null}
        </div>
        {showOpen ? (
          <button type="button" onClick={() => onOpenRecord(item)} className={btnCls}>
            Open record
          </button>
        ) : null}
      </div>
    </div>
  );
}
