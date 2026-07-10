import React, { useEffect, useMemo, useState } from 'react';
import { Check, HelpCircle, Loader2, Save, X } from 'lucide-react';
import { ModalFrame } from '../../layout';
import {
  FINISHED_CONFIRM,
  LINE_STATUS,
  QUERY_REASONS,
  getLineEntry,
  parseLineClearance,
  roundKg,
  roundM,
  setLineEntry,
} from '../../../lib/stockRegisterLineClearance.js';
import { LINE_STATUS_LABELS } from './stockRegisterConstants';
import { fetchLineDetail } from './stockRegisterApi';

function fmtQty(v, kind) {
  if (v == null || v === '') return '—';
  return kind === 'coil' ? roundKg(v).toLocaleString() : roundM(v).toLocaleString();
}

function systemValue(item) {
  const r = item?.row || {};
  if (item?.kind === 'coil') return r.closingKg;
  if (item?.kind === 'finished') return null;
  if (item?.kind === 'stone') return r.remainingM;
  if (item?.kind === 'accessory') return r.balance;
  return null;
}

function lineTitle(item) {
  if (!item) return 'Line detail';
  if (item.kind === 'coil' || item.kind === 'finished') {
    return `Coil ${item.row?.coilNoDisplay || item.row?.coilNo || '—'}`;
  }
  if (item.kind === 'stone') return item.row?.colourDisplay || item.row?.colour || 'Stone line';
  if (item.kind === 'accessory') return item.row?.itemName || 'Accessory';
  if (item.kind === 'intransit') return item.row?.itemName || 'In-transit';
  return 'Line detail';
}

/**
 * Per-line BM review — system vs counted, production jobs, mark OK / adjust / query.
 */
export function StockRegisterLineDetailModal({
  open,
  onClose,
  periodKey,
  lineKey,
  lineClearance,
  onSaveLine,
  showToast,
}) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [entry, setEntry] = useState(null);
  const [saving, setSaving] = useState(false);

  const item = detail?.item;
  const kind = item?.kind;
  const isFinished = kind === 'finished';
  const isCoil = kind === 'coil';
  const unitLabel = isCoil ? 'kg' : kind === 'stone' ? 'm' : kind === 'accessory' ? item?.row?.unit || 'unit' : '';

  useEffect(() => {
    if (!open || !periodKey || !lineKey) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { ok, data } = await fetchLineDetail(periodKey, lineKey);
        if (cancelled) return;
        if (!ok || !data?.ok) {
          showToast?.(data?.error || 'Could not load line detail.', { variant: 'error' });
          setDetail(null);
          return;
        }
        setDetail(data);
        const clearance = parseLineClearance(lineClearance);
        setEntry(getLineEntry(clearance, lineKey));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, periodKey, lineKey, lineClearance, showToast]);

  const sysVal = useMemo(() => systemValue(item), [item]);

  const countedField = isCoil
    ? 'countedClosingKg'
    : kind === 'stone'
      ? 'countedRemainingM'
      : kind === 'accessory'
        ? 'countedBalance'
        : null;

  const patchEntry = (patch) => setEntry((prev) => ({ ...prev, ...patch }));

  const applyAction = (action) => {
    if (action === 'ok') {
      patchEntry({ status: LINE_STATUS.CLEARED, queryReason: '', note: entry?.note || '' });
      if (countedField) patchEntry({ [countedField]: sysVal });
    } else if (action === 'adjust') {
      patchEntry({ status: LINE_STATUS.ADJUSTED });
    } else if (action === 'query') {
      patchEntry({ status: LINE_STATUS.QUERY, queryReason: entry?.queryReason || QUERY_REASONS[0] });
    }
  };

  const save = async () => {
    if (!entry || !lineKey) return;
    if (entry.status === LINE_STATUS.ADJUSTED && countedField) {
      const counted = entry[countedField];
      const sys = sysVal;
      if (counted == null || counted === '') {
        showToast?.('Enter counted quantity for adjustment.', { variant: 'error' });
        return;
      }
      const differs = sys != null && (isCoil ? roundKg(counted) !== roundKg(sys) : roundM(counted) !== roundM(sys));
      if (differs && isCoil && !String(entry.materialExceptionId || '').trim()) {
        showToast?.('Material exception (MEX) ID required when count differs from system.', { variant: 'error' });
        return;
      }
    }
    if (isFinished && entry.finishedConfirm === FINISHED_CONFIRM.DISPUTED && !String(entry.materialExceptionId || '').trim()) {
      showToast?.('MEX ID required for disputed finished coils.', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const next = setLineEntry(lineClearance, lineKey, {
        ...entry,
        ...(countedField && entry[countedField] != null
          ? { [countedField]: isCoil ? roundKg(entry[countedField]) : roundM(entry[countedField]) }
          : {}),
      });
      await onSaveLine?.(next, lineKey);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalFrame isOpen={open} onClose={onClose} showCloseButton={false} surface="plain" title={lineTitle(item)}>
      <div className="z-modal-panel-lg flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Line clearance</p>
            <h2 className="text-lg font-bold text-zarewa-teal">{lineTitle(item)}</h2>
            {item?.gaugeLabel ? <p className="text-sm text-slate-600">{item.gaugeLabel}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="z-btn-secondary p-2" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 sm:px-5 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </p>
          ) : null}

          {!loading && item ? (
            <>
              {!isFinished && kind !== 'intransit' ? (
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm">
                  <div>
                    <p className="text-ui-xs font-bold uppercase text-slate-500">System</p>
                    <p className="text-lg font-black text-zarewa-teal tabular-nums">
                      {fmtQty(sysVal, kind)} {unitLabel}
                    </p>
                  </div>
                  {entry?.status === LINE_STATUS.ADJUSTED && countedField ? (
                    <div>
                      <label className="text-ui-xs font-bold uppercase text-slate-500">Counted</label>
                      <input
                        type="number"
                        step={isCoil ? 1 : 0.01}
                        className="z-input w-full mt-0.5 text-right tabular-nums"
                        value={entry[countedField] ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const v = raw === '' ? '' : isCoil ? roundKg(raw) : roundM(raw);
                          patchEntry({ [countedField]: v });
                        }}
                      />
                    </div>
                  ) : entry?.status === LINE_STATUS.CLEARED ? (
                    <div>
                      <p className="text-ui-xs font-bold uppercase text-slate-500">Counted</p>
                      <p className="text-lg font-bold tabular-nums">{fmtQty(sysVal, kind)} {unitLabel}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isFinished ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">Finished coil — confirm consumed</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      [FINISHED_CONFIRM.CONFIRMED, 'Confirm finished'],
                      [FINISHED_CONFIRM.DISPUTED, 'Disputed — still on floor'],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                          entry?.finishedConfirm === val
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                        }`}
                        onClick={() => patchEntry({ finishedConfirm: val, status: LINE_STATUS.CLEARED })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : kind !== 'intransit' ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="z-btn-primary text-xs inline-flex items-center gap-1" onClick={() => applyAction('ok')}>
                    <Check size={12} /> Mark OK
                  </button>
                  <button type="button" className="z-btn-secondary text-xs" onClick={() => applyAction('adjust')}>
                    Adjust
                  </button>
                  <button type="button" className="z-btn-secondary text-xs inline-flex items-center gap-1" onClick={() => applyAction('query')}>
                    <HelpCircle size={12} /> Query
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="z-btn-primary text-xs"
                  onClick={() => patchEntry({ status: LINE_STATUS.CLEARED, note: entry?.note || 'Reviewed' })}
                >
                  Mark reviewed
                </button>
              )}

              {entry?.status ? (
                <p className="text-xs text-slate-600">
                  Status: <strong>{LINE_STATUS_LABELS[entry.status] || entry.status}</strong>
                </p>
              ) : null}

              {entry?.status === LINE_STATUS.QUERY ? (
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Query reason</span>
                  <select
                    className="z-input w-full mt-1"
                    value={entry.queryReason || QUERY_REASONS[0]}
                    onChange={(e) => patchEntry({ queryReason: e.target.value })}
                  >
                    {QUERY_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {(entry?.status === LINE_STATUS.ADJUSTED ||
                (isFinished && entry?.finishedConfirm === FINISHED_CONFIRM.DISPUTED)) ? (
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Material exception (MEX) ID</span>
                  <input
                    type="text"
                    className="z-input w-full mt-1 font-mono text-sm"
                    value={entry.materialExceptionId || ''}
                    onChange={(e) => patchEntry({ materialExceptionId: e.target.value })}
                    placeholder="Required when count differs from system"
                  />
                </label>
              ) : null}

              <label className="block text-sm">
                <span className="font-medium text-slate-700">Note</span>
                <textarea
                  className="z-input w-full mt-1 min-h-[2.5rem]"
                  value={entry?.note || ''}
                  onChange={(e) => patchEntry({ note: e.target.value })}
                />
              </label>

              {(kind === 'coil' || kind === 'finished') && detail?.productionJobs?.length ? (
                <div>
                  <p className="text-ui-xs font-black uppercase tracking-wide text-slate-600 mb-2">
                    Production jobs this period
                  </p>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg">
                    <table className="w-full text-ui-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left p-1.5">Date</th>
                          <th className="text-left p-1.5">Job</th>
                          <th className="text-left p-1.5">QT</th>
                          <th className="text-right p-1.5">m</th>
                          <th className="text-right p-1.5">kg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.productionJobs.map((j) => (
                          <tr key={j.jobID} className="border-t border-slate-100">
                            <td className="p-1">{j.productionDateISO}</td>
                            <td className="p-1 font-mono">{j.jobIdDisplay}</td>
                            <td className="p-1">{j.qtDisplay}</td>
                            <td className="p-1 text-right tabular-nums">{j.metres}</td>
                            <td className="p-1 text-right tabular-nums">{j.kgUsed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <footer className="shrink-0 flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button type="button" className="z-btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="z-btn-primary inline-flex items-center gap-2" onClick={save} disabled={loading || saving || !entry}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save line
          </button>
        </footer>
      </div>
    </ModalFrame>
  );
}
