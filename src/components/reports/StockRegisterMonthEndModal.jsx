import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FinanceSequencePanel, ModalFrame } from '../layout';
import { StockRegisterPanel } from './StockRegisterPanel';
import {
  defaultStockRegisterMonthKey,
  formatStockRegisterMonth,
  monthKeyFromPeriodEnd,
  periodEndIsoFromMonthKey,
} from '../../lib/stockRegisterPeriod';

const TITLES = {
  store: 'Month-end stock count',
  manager: 'Stock register — manager review',
  procurement: 'Stock register — procurement costing',
  reports: 'Stock register — finance review',
};

const SUBTITLES = {
  store: 'Print the blind count sheet, confirm on the floor, then send to the branch manager.',
  manager: 'Clear every line against the count, then approve to procurement.',
  procurement: 'Enter closing costs, then capture & lock opening balances.',
  reports: 'Finance view of month-end stock — monitor stage and reopen if needed.',
};

/**
 * Month-end stock desk — full ceremony workspace (Sequence / Accounting Close language).
 * Period is month + year only; closes on last calendar day.
 * @param {'store'|'manager'|'procurement'|'reports'} roleMode
 */
export function StockRegisterMonthEndModal({
  isOpen,
  onClose,
  roleMode = 'store',
  branchId,
  branchLabel,
  showToast,
  roleKey,
  initialPeriodEnd,
}) {
  const [monthKey, setMonthKey] = useState(() =>
    monthKeyFromPeriodEnd(initialPeriodEnd) || defaultStockRegisterMonthKey()
  );

  useEffect(() => {
    if (isOpen) {
      setMonthKey(monthKeyFromPeriodEnd(initialPeriodEnd) || defaultStockRegisterMonthKey());
    }
  }, [initialPeriodEnd, isOpen]);

  const periodEnd = periodEndIsoFromMonthKey(monthKey);
  const monthLabel = formatStockRegisterMonth(monthKey);
  const title = TITLES[roleMode] || 'Stock register';
  const subtitle = SUBTITLES[roleMode] || '';

  const onMonthChange = (next) => {
    if (String(next) === String(monthKey)) return;
    const ok = window.confirm(
      `Switch to ${formatStockRegisterMonth(next)}?\n\nIf a count is already in progress for ${monthLabel}, you will be looking at a different month’s register.`
    );
    if (!ok) return;
    setMonthKey(next);
  };

  const wide = roleMode === 'manager' || roleMode === 'reports' || roleMode === 'procurement';

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} showCloseButton={false} surface="plain" title={title}>
      <div
        className={`z-modal-panel-lg flex h-[min(96dvh,920px)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-xl ${
          wide ? 'max-w-6xl' : 'max-w-3xl'
        }`}
      >
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 pb-2 sm:px-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex gap-3 sm:gap-4 flex-1">
              <span
                className="hidden sm:block w-1 shrink-0 rounded-full bg-gradient-to-b from-teal-400 via-teal-600 to-zarewa-teal self-stretch min-h-[2.5rem]"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 mb-1">Physical stock</p>
                <h1 className="z-page-title !text-xl sm:!text-2xl">{title}</h1>
                <p className="z-page-subtitle !text-sm mt-1">
                  <span className="font-semibold text-slate-800">{branchLabel || branchId || 'Branch'}</span>
                  <span className="text-slate-400"> · </span>
                  <span className="font-semibold text-slate-800">{monthLabel}</span>
                  <span className="text-slate-400"> · </span>
                  {subtitle}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <label className="block text-sm min-w-[9.5rem]">
                <span className="sr-only">Month</span>
                <input
                  type="month"
                  className="z-input w-full"
                  value={monthKey}
                  onChange={(e) => onMonthChange(e.target.value)}
                  title="Month closes on the last calendar day"
                />
              </label>
              <button type="button" onClick={onClose} className="z-btn-secondary p-2" aria-label="Close">
                <X size={18} />
              </button>
            </div>
          </div>
          <p className="text-ui-xs text-slate-500 pl-0 sm:pl-5">
            Counts and lock always use month-end — day is not selectable.
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 sm:px-6">
          <FinanceSequencePanel className="!min-h-0 sm:!min-h-0">
            <StockRegisterPanel
              roleMode={roleMode}
              embedded
              endDate={periodEnd}
              branchId={branchId}
              branchLabel={branchLabel}
              showToast={showToast}
              roleKey={roleKey}
            />
          </FinanceSequencePanel>
        </div>
      </div>
    </ModalFrame>
  );
}
