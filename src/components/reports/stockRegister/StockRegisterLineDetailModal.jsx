import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  HelpCircle,
  History,
  Layers,
  Loader2,
  Save,
  Scale,
  Sparkles,
  X,
} from 'lucide-react';
import { ModalFrame } from '../../layout';
import {
  FINISHED_CONFIRM,
  LINE_STATUS,
  MANAGER_FINISH_NOTE_MIN,
  QUERY_REASONS,
  getLineEntry,
  parseLineClearance,
  roundKg,
  roundM,
  setLineEntry,
} from '../../../lib/stockRegisterLineClearance';
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
    const num = item.row?.coilNoDisplay || item.row?.coilNo || '—';
    const col = item.row?.colourDisplay || item.row?.colourAbbrev;
    return col ? `Coil #${num} · ${col}` : `Coil #${num}`;
  }
  if (item.kind === 'stone') {
    return item.row?.colourDisplay || item.row?.colourAbbrev || item.row?.productID || 'Stone-coated';
  }
  if (item.kind === 'accessory') return item.row?.itemName || item.row?.productID || 'Accessory';
  if (item.kind === 'intransit') return item.row?.itemName || item.row?.referenceNo || 'In-transit';
  return 'Line detail';
}

function kindBadgeLabel(kind) {
  if (kind === 'coil') return 'Active Coil';
  if (kind === 'finished') return 'Finished Coil';
  if (kind === 'stone') return 'Stone-Coated';
  if (kind === 'accessory') return 'Accessory';
  if (kind === 'intransit') return 'In-Transit';
  return 'Stock Item';
}

/**
 * Line clearance popup — provides complete context, system vs physical count comparison,
 * live discrepancy calculation, MEX linking, production job history, and Previous / Next navigation.
 */
export function StockRegisterLineDetailModal({
  open,
  onClose,
  periodKey,
  lineKey,
  lineClearance,
  onSaveLine,
  showToast,
  linesList = [],
  currentLineIndex = -1,
  onNavigateLine,
}) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [entry, setEntry] = useState(null);
  const [saving, setSaving] = useState(false);

  const item = detail?.item;
  const kind = item?.kind;
  const isFinished = kind === 'finished';
  const isCoil = kind === 'coil';
  const unitLabel = isCoil ? 'kg' : kind === 'stone' ? 'm' : kind === 'accessory' ? item?.row?.unit || 'units' : '';

  const countedField = isCoil
    ? 'countedClosingKg'
    : kind === 'stone'
      ? 'countedRemainingM'
      : kind === 'accessory'
        ? 'countedBalance'
        : null;

  // Load line detail
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

  const patchEntry = useCallback(
    (patch) => setEntry((prev) => ({ ...(prev || {}), ...patch })),
    []
  );

  // Computed variance
  const countedValue = useMemo(() => {
    if (!countedField || !entry) return null;
    const v = entry[countedField];
    if (v == null || v === '') return null;
    return isCoil ? roundKg(v) : roundM(v);
  }, [countedField, entry, isCoil]);

  const discrepancy = useMemo(() => {
    if (sysVal == null || countedValue == null) return null;
    const diff = countedValue - sysVal;
    const pct = sysVal > 0 ? (diff / sysVal) * 100 : 0;
    return {
      diff: isCoil ? roundKg(diff) : roundM(diff),
      pct: Math.round(pct * 10) / 10,
      isExactMatch: Math.abs(diff) === 0,
    };
  }, [sysVal, countedValue, isCoil]);

  // Actions
  const applyAction = (action) => {
    if (action === 'ok') {
      patchEntry({
        status: LINE_STATUS.CLEARED,
        markFinished: false,
        queryReason: '',
        note: entry?.note || '',
        ...(countedField ? { [countedField]: sysVal } : {}),
      });
    } else if (action === 'adjust') {
      patchEntry({
        status: LINE_STATUS.ADJUSTED,
        markFinished: false,
        queryReason: '',
      });
    } else if (action === 'finish') {
      patchEntry({
        status: LINE_STATUS.FINISHED,
        markFinished: true,
        queryReason: '',
        finishedConfirm: FINISHED_CONFIRM.CONFIRMED,
        countedClosingKg: 0,
      });
    } else if (action === 'query') {
      patchEntry({
        status: LINE_STATUS.QUERY,
        markFinished: false,
        queryReason: entry?.queryReason || QUERY_REASONS[0],
      });
    }
  };

  const handleMatchSystem = () => {
    if (sysVal == null) return;
    patchEntry({
      status: LINE_STATUS.CLEARED,
      queryReason: '',
      ...(countedField ? { [countedField]: sysVal } : {}),
    });
  };

  const handleCountChange = (raw) => {
    if (raw === '') {
      patchEntry({ [countedField]: '' });
      return;
    }
    const val = isCoil ? roundKg(raw) : roundM(raw);
    const diff = sysVal != null ? val - sysVal : 0;
    const nextStatus = diff === 0 ? LINE_STATUS.CLEARED : LINE_STATUS.ADJUSTED;
    patchEntry({
      [countedField]: val,
      status: nextStatus,
    });
  };

  const saveLine = async (shouldNavigateNext = false) => {
    if (!entry || !lineKey) return;

    if (isCoil && (entry.status === LINE_STATUS.FINISHED || entry.markFinished)) {
      if (String(entry.note || '').trim().length < MANAGER_FINISH_NOTE_MIN) {
        showToast?.(
          `Enter a note of at least ${MANAGER_FINISH_NOTE_MIN} characters when marking a coil finished.`,
          { variant: 'error' }
        );
        return;
      }
    }

    if (entry.status === LINE_STATUS.ADJUSTED && countedField) {
      const counted = entry[countedField];
      const sys = sysVal;
      if (counted == null || counted === '') {
        showToast?.('Enter counted physical quantity for adjustment.', { variant: 'error' });
        return;
      }
      const differs =
        sys != null && (isCoil ? roundKg(counted) !== roundKg(sys) : roundM(counted) !== roundM(sys));
      if (differs && isCoil && !String(entry.materialExceptionId || '').trim()) {
        showToast?.('Material Exception (MEX) ID is required when physical weight differs from system.', {
          variant: 'error',
        });
        return;
      }
    }

    if (
      isFinished &&
      entry.finishedConfirm === FINISHED_CONFIRM.DISPUTED &&
      !String(entry.materialExceptionId || '').trim()
    ) {
      showToast?.('Material Exception (MEX) ID is required for disputed finished coils.', {
        variant: 'error',
      });
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

      if (shouldNavigateNext && onNavigateLine && linesList.length > 0) {
        const nextIdx = currentLineIndex + 1;
        if (nextIdx < linesList.length) {
          onNavigateLine(linesList[nextIdx].key);
          return;
        }
      }
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  // Navigation handlers
  const hasPrev = currentLineIndex > 0;
  const hasNext = currentLineIndex >= 0 && currentLineIndex < linesList.length - 1;

  const handlePrev = () => {
    if (hasPrev && onNavigateLine) {
      onNavigateLine(linesList[currentLineIndex - 1].key);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigateLine) {
      onNavigateLine(linesList[currentLineIndex + 1].key);
    }
  };

  const saveLineRef = useRef(saveLine);
  const handlePrevRef = useRef(handlePrev);
  const handleNextRef = useRef(handleNext);

  useEffect(() => {
    saveLineRef.current = saveLine;
    handlePrevRef.current = handlePrev;
    handleNextRef.current = handleNext;
  });

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          saveLineRef.current(false);
        }
        return;
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevRef.current();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Production jobs summary
  const totalProductionKg = useMemo(() => {
    if (!detail?.productionJobs?.length) return 0;
    return detail.productionJobs.reduce((sum, j) => sum + (Number(j.kgUsed) || 0), 0);
  }, [detail?.productionJobs]);

  const totalProductionMetres = useMemo(() => {
    if (!detail?.productionJobs?.length) return 0;
    return detail.productionJobs.reduce((sum, j) => sum + (Number(j.metres) || 0), 0);
  }, [detail?.productionJobs]);

  const activeStatus = entry?.status || LINE_STATUS.PENDING;

  return (
    <ModalFrame
      isOpen={open}
      onClose={onClose}
      surface="plain"
      title={lineTitle(item)}
      showCloseButton={false}
    >
      <div className="z-modal-panel-lg flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800 border border-teal-200">
                {kindBadgeLabel(kind)}
              </span>
              {item?.gaugeLabel ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200">
                  {item.gaugeLabel} {item.family ? `· ${item.family}` : ''}
                </span>
              ) : null}
              {currentLineIndex >= 0 && linesList.length > 0 ? (
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                  Line {currentLineIndex + 1} of {linesList.length}
                </span>
              ) : null}
            </div>
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {lineTitle(item)}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {linesList.length > 1 ? (
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs mr-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!hasPrev || saving}
                  title="Previous Line (Alt + Left Arrow)"
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowLeft size={15} />
                </button>
                <span className="h-4 w-px bg-slate-200 mx-0.5" />
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!hasNext || saving}
                  title="Next Line (Alt + Right Arrow)"
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="z-btn-secondary p-2 text-slate-400 hover:text-slate-700"
              aria-label="Close"
              disabled={saving}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 size={24} className="animate-spin text-zarewa-teal" />
              <p className="text-xs font-semibold">Loading physical stock data…</p>
            </div>
          ) : null}

          {!loading && item ? (
            <>
              {/* System vs Counted Comparison Card */}
              {!isFinished && kind !== 'intransit' ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Scale size={14} className="text-zarewa-teal" />
                      Physical Count Verification
                    </h3>
                    {sysVal != null ? (
                      <button
                        type="button"
                        onClick={handleMatchSystem}
                        className="text-ui-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-md px-2 py-1 hover:bg-teal-100 transition inline-flex items-center gap-1"
                        title="Copy system balance into physical count"
                      >
                        <Sparkles size={11} />
                        Exact Match ({fmtQty(sysVal, kind)} {unitLabel})
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* System Registered Qty */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Registered System Stock
                      </p>
                      <p className="text-2xl font-black text-slate-900 mt-0.5 tabular-nums">
                        {fmtQty(sysVal, kind)}{' '}
                        <span className="text-sm font-semibold text-slate-500">{unitLabel}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Opening + inward receipts - jobs produced
                      </p>
                    </div>

                    {/* Physical Count Input */}
                    <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5">
                      <label
                        htmlFor="line-counted-qty-input"
                        className="block text-[10px] font-bold uppercase tracking-wider text-teal-900"
                      >
                        Physical Yard Count
                      </label>
                      <div className="relative mt-1">
                        <input
                          id="line-counted-qty-input"
                          type="number"
                          step={isCoil ? 1 : 0.01}
                          className="z-input w-full pr-12 text-lg font-black text-slate-900 tabular-nums bg-white border-teal-300 focus:border-teal-600 focus:ring-teal-200"
                          value={entry?.[countedField] ?? ''}
                          onChange={(e) => handleCountChange(e.target.value)}
                          placeholder={sysVal != null ? String(sysVal) : '0'}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          {unitLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-teal-800 mt-1 font-medium">
                        Enter physical quantity verified on yard floor
                      </p>
                    </div>
                  </div>

                  {/* Discrepancy indicator pill */}
                  {discrepancy ? (
                    <div
                      className={`rounded-xl border p-3 flex items-center justify-between gap-2 text-xs transition-colors ${
                        discrepancy.isExactMatch
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : discrepancy.diff > 0
                            ? 'border-amber-200 bg-amber-50 text-amber-950'
                            : 'border-rose-200 bg-rose-50 text-rose-950'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {discrepancy.isExactMatch ? (
                          <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                        ) : (
                          <AlertCircle size={16} className="text-amber-700 shrink-0" />
                        )}
                        <span>
                          {discrepancy.isExactMatch ? (
                            <strong>Exact Match:</strong>
                          ) : (
                            <strong>Discrepancy:</strong>
                          )}{' '}
                          {discrepancy.isExactMatch
                            ? 'Physical yard count exactly matches system register.'
                            : `${discrepancy.diff > 0 ? '+' : ''}${discrepancy.diff} ${unitLabel} (${discrepancy.pct}% variance from register).`}
                        </span>
                      </div>
                      {!discrepancy.isExactMatch ? (
                        <span className="font-bold uppercase tracking-wider text-[10px] rounded-md px-2 py-0.5 border border-amber-300 bg-white text-amber-900 shrink-0 shadow-2xs">
                          MEX Required
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Finished Coil Mode */}
              {isFinished ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-zarewa-teal" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Finished Coil Verification
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        This coil was recorded as completely consumed during production this month. Registered balance is 0 kg.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        patchEntry({
                          finishedConfirm: FINISHED_CONFIRM.CONFIRMED,
                          status: LINE_STATUS.CLEARED,
                        })
                      }
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                        entry?.finishedConfirm === FINISHED_CONFIRM.CONFIRMED
                          ? 'border-teal-600 bg-teal-50/80 shadow-xs ring-1 ring-teal-600'
                          : 'border-slate-200 bg-white hover:border-teal-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                            entry?.finishedConfirm === FINISHED_CONFIRM.CONFIRMED
                              ? 'bg-zarewa-teal text-white'
                              : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {entry?.finishedConfirm === FINISHED_CONFIRM.CONFIRMED ? '✓' : ''}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Confirm Consumed
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-6">
                        Coil was fully converted into products and no longer exists in yard.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        patchEntry({
                          finishedConfirm: FINISHED_CONFIRM.DISPUTED,
                          status: LINE_STATUS.QUERY,
                        })
                      }
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                        entry?.finishedConfirm === FINISHED_CONFIRM.DISPUTED
                          ? 'border-rose-600 bg-rose-50/80 shadow-xs ring-1 ring-rose-600'
                          : 'border-slate-200 bg-white hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                            entry?.finishedConfirm === FINISHED_CONFIRM.DISPUTED
                              ? 'bg-rose-600 text-white'
                              : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {entry?.finishedConfirm === FINISHED_CONFIRM.DISPUTED ? '!' : ''}
                        </span>
                        <span className="text-xs font-bold text-rose-950">
                          Disputed (Still on Floor)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-6">
                        Coil still physically remains in warehouse. Flags coil and requires MEX ID.
                      </p>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Status Selector Tabs (Cleared / Adjusted / Query) */}
              {!isFinished && kind !== 'intransit' ? (
                <div className="space-y-2">
                  <label className="block text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                    Clearance Decision
                  </label>
                  <div className={`grid gap-2 ${isCoil ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    <button
                      type="button"
                      onClick={() => applyAction('ok')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition inline-flex items-center justify-center gap-1.5 ${
                        activeStatus === LINE_STATUS.CLEARED
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-teal-50/40'
                      }`}
                    >
                      <Check size={14} />
                      Mark OK
                    </button>

                    <button
                      type="button"
                      onClick={() => applyAction('adjust')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition inline-flex items-center justify-center gap-1.5 ${
                        activeStatus === LINE_STATUS.ADJUSTED
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                      }`}
                    >
                      <Scale size={14} />
                      Adjust Qty
                    </button>

                    {isCoil ? (
                      <button
                        type="button"
                        onClick={() => applyAction('finish')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition inline-flex items-center justify-center gap-1.5 ${
                          activeStatus === LINE_STATUS.FINISHED
                            ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <Layers size={14} />
                        Mark finished
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => applyAction('query')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition inline-flex items-center justify-center gap-1.5 ${
                        activeStatus === LINE_STATUS.QUERY
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/40'
                      }`}
                    >
                      <HelpCircle size={14} />
                      Flag Query
                    </button>
                  </div>
                </div>
              ) : null}

              {isCoil && activeStatus === LINE_STATUS.FINISHED ? (
                <div className="rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-xs text-slate-700 leading-relaxed">
                  Approving this register clears the remaining{' '}
                  <strong>{fmtQty(sysVal, 'coil')} kg</strong> from yard stock and marks the coil finished.
                  It leaves the active coil list. A note is required.
                </div>
              ) : null}

              {/* Query Reason dropdown if Query */}
              {activeStatus === LINE_STATUS.QUERY ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-2">
                  <label className="block text-xs font-bold text-rose-950">
                    Reason for Query
                  </label>
                  <select
                    className="z-input w-full bg-white text-xs font-semibold"
                    value={entry?.queryReason || QUERY_REASONS[0]}
                    onChange={(e) => patchEntry({ queryReason: e.target.value })}
                  >
                    {QUERY_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-rose-800">
                    Queried lines prevent final approval until resolved with the storekeeper or recorded under a Material Exception.
                  </p>
                </div>
              ) : null}

              {/* MEX ID input if Adjusted or Disputed */}
              {activeStatus === LINE_STATUS.ADJUSTED ||
              (isFinished && entry?.finishedConfirm === FINISHED_CONFIRM.DISPUTED) ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-950">
                    <FileCheck2 size={16} className="text-amber-700 shrink-0" />
                    <label
                      htmlFor="line-mex-id-input"
                      className="text-xs font-bold uppercase tracking-wider"
                    >
                      Material Exception (MEX) Ticket ID
                    </label>
                  </div>
                  <input
                    id="line-mex-id-input"
                    type="text"
                    className="z-input w-full font-mono text-xs uppercase bg-white border-amber-300 focus:border-amber-600"
                    value={entry?.materialExceptionId || ''}
                    onChange={(e) => patchEntry({ materialExceptionId: e.target.value.toUpperCase() })}
                    placeholder="e.g. MEX-KD-26-0042"
                  />
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    ERP governance requires a Material Exception record to document weight shrinkage, scale drift, scrap, offcuts, or receipt variances.
                  </p>
                </div>
              ) : null}

              {/* Manager Note Textarea */}
              <div className="space-y-1">
                <label className="block text-ui-xs font-bold uppercase tracking-wider text-slate-600">
                  Manager Review Note{' '}
                  {isCoil && activeStatus === LINE_STATUS.FINISHED ? (
                    <span className="text-rose-700 font-bold">(Required)</span>
                  ) : (
                    <span className="text-slate-500 font-normal">(Optional)</span>
                  )}
                </label>
                <textarea
                  className="z-input w-full min-h-[3rem] text-xs leading-relaxed"
                  value={entry?.note || ''}
                  onChange={(e) => patchEntry({ note: e.target.value })}
                  placeholder="e.g. Verified with store officer. Minor offcut remaining on drum."
                />
              </div>

              {/* Production Job History */}
              {(kind === 'coil' || kind === 'finished') && detail?.productionJobs?.length ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <History size={14} className="text-zarewa-teal" />
                      Production Activity This Month
                    </h4>
                    <span className="text-[11px] font-bold text-slate-600 tabular-nums">
                      {detail.productionJobs.length} job{detail.productionJobs.length === 1 ? '' : 's'} ·{' '}
                      {totalProductionKg.toLocaleString()} kg used ({totalProductionMetres.toLocaleString()} m)
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
                        <tr>
                          <th className="py-1.5 px-2.5">Date</th>
                          <th className="py-1.5 px-2.5">Job Ref</th>
                          <th className="py-1.5 px-2.5">Quotation</th>
                          <th className="py-1.5 px-2.5 text-right">Metres</th>
                          <th className="py-1.5 px-2.5 text-right">Weight (kg)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.productionJobs.map((j) => (
                          <tr key={j.jobID} className="hover:bg-slate-50/50">
                            <td className="py-1 px-2.5 text-slate-600 text-[11px]">
                              {j.productionDateISO || '—'}
                            </td>
                            <td className="py-1 px-2.5 font-mono text-[11px] font-semibold text-slate-800">
                              {j.jobIdDisplay || j.jobID}
                            </td>
                            <td className="py-1 px-2.5 font-mono text-[11px] text-slate-600">
                              {j.qtDisplay || '—'}
                            </td>
                            <td className="py-1 px-2.5 text-right tabular-nums text-slate-700">
                              {j.metres != null ? Number(j.metres).toLocaleString() : '—'}
                            </td>
                            <td className="py-1 px-2.5 text-right tabular-nums font-bold text-slate-900">
                              {j.kgUsed != null ? Number(j.kgUsed).toLocaleString() : '—'}
                            </td>
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

        {/* Footer Actions */}
        <footer className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <button
            type="button"
            className="z-btn-secondary text-xs"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="z-btn-secondary text-xs inline-flex items-center gap-1.5"
              onClick={() => saveLine(false)}
              disabled={loading || saving || !entry}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save Line
            </button>

            {hasNext ? (
              <button
                type="button"
                className="z-btn-primary text-xs inline-flex items-center gap-1.5 shadow-sm"
                onClick={() => saveLine(true)}
                disabled={loading || saving || !entry}
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    <span>Save &amp; Next</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </ModalFrame>
  );
}
