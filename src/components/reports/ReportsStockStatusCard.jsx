import React from 'react';
import { Loader2, Package } from 'lucide-react';
import { formatStockRegisterMonth } from '../../lib/stockRegisterPeriod';

/**
 * Compact stock status — full workflow opens in StockRegisterMonthEndModal.
 * Pass statusApi from useStockRegisterStatus in the parent (single fetch).
 */
export function ReportsStockStatusCard({
  endDate,
  branchId,
  branchLabel,
  showToast,
  onOpen,
  statusApi,
}) {
  const { loading, error, stepLabel, ready, reload, monthLabel, waitingLabel } = statusApi || {
    loading: false,
    error: '',
    stepLabel: '—',
    ready: false,
    reload: () => {},
    monthLabel: formatStockRegisterMonth(endDate),
    waitingLabel: '—',
  };

  const displayMonth = monthLabel || formatStockRegisterMonth(endDate);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-zarewa-teal tracking-tight">Stock register</h3>
          <p className="text-sm text-slate-600 mt-1">
            Finance review for {branchLabel || branchId || 'branch'} · <strong>{displayMonth}</strong>
          </p>
        </div>
        {loading ? <Loader2 size={18} className="animate-spin text-slate-400" aria-hidden /> : null}
      </div>

      {!branchId ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Select a branch workspace (not HQ roll-up) to load the stock register.
        </p>
      ) : null}

      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

      {branchId && !error ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">
            {loading ? 'Loading…' : waitingLabel}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${
                ready
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-amber-200 bg-amber-50 text-amber-950'
              }`}
            >
              {loading ? '…' : stepLabel}
            </span>
            <button
              type="button"
              className="z-btn-primary !text-xs"
              disabled={!branchId}
              onClick={() => {
                if (!branchId) {
                  showToast?.('Select a branch first.', { variant: 'error' });
                  return;
                }
                onOpen?.();
              }}
            >
              <Package size={14} />
              Open stock register
            </button>
            <button type="button" className="z-btn-secondary !text-xs" onClick={reload} disabled={loading || !branchId}>
              Refresh status
            </button>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        Store count and manager review stay on Operations / Manager desks. This opens the finance view for print and
        close checks.
      </p>
    </div>
  );
}
