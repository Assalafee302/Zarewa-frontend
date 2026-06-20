import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useAccountingDesk } from './AccountingDeskContext';

/**
 * Shared branch / period / cutover context for Accounting Desk panels.
 * @param {{ hidePeriod?: boolean; onRefresh?: () => void; refreshing?: boolean }} props
 */
export function AccountingDeskContextBar({ hidePeriod = false, onRefresh, refreshing = false }) {
  const {
    periodKey,
    setPeriodKey,
    branchScopeLabel,
    cutoverMode,
    requestDeskRefresh,
  } = useAccountingDesk();

  const handleRefresh = () => {
    requestDeskRefresh();
    onRefresh?.();
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between rounded-xl border border-slate-200/90 bg-slate-50/60 px-3 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">
          Branch: {branchScopeLabel || 'All branches'}
        </span>
        {!hidePeriod ? (
          <label className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Period
            <input
              type="month"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800"
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
            />
          </label>
        ) : null}
        <span
          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            cutoverMode === 'live'
              ? 'border-teal-200 bg-teal-50 text-teal-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {cutoverMode === 'live' ? 'Live GL' : 'Pre-cutover'}
        </span>
      </div>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50 disabled:opacity-50"
      >
        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        Refresh
      </button>
    </div>
  );
}
