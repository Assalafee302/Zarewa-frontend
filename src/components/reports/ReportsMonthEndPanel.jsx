import React from 'react';
import { CheckCircle2, Circle, Download, Loader2, Package } from 'lucide-react';
import { ReportsExportCatalog } from './ReportsExportCatalog.jsx';
import { formatDownloadedAgo } from '../../lib/reportsExportCatalog.js';

/**
 * Month-end close job — checklist + primary bundle + recommended shortlist.
 */
export function ReportsMonthEndPanel({
  periodValid,
  periodLabel,
  branchLabel,
  hasFinanceView,
  stockReady,
  openExceptionCount,
  onDownloadBundle,
  onOpenStock,
  onOpenExceptions,
  onRequestExport,
  onGoExports,
  bundleBusy = false,
  bundleDownloadedAt = '',
  lastDownloadMap = {},
  busyId = null,
}) {
  const bundleDone = Boolean(bundleDownloadedAt);
  const bundleAgo = formatDownloadedAgo(bundleDownloadedAt);

  const steps = [
    {
      id: 'period',
      done: periodValid,
      label: 'Period set',
      detail: periodLabel,
    },
    {
      id: 'exceptions',
      done: openExceptionCount === 0,
      label: openExceptionCount > 0 ? `${openExceptionCount} exception(s) open` : 'Exceptions clear',
      detail: openExceptionCount > 0 ? 'Review before close' : 'No open payment exceptions',
      action: openExceptionCount > 0 ? onOpenExceptions : null,
      actionLabel: 'Review',
    },
    {
      id: 'stock',
      done: Boolean(stockReady),
      label: 'Stock register',
      detail: stockReady ? 'Reviewed for this end date' : 'Confirm or open finance review',
      action: onOpenStock,
      actionLabel: 'Open stock',
    },
    {
      id: 'bundle',
      done: bundleDone,
      label: 'Download month-end workbooks',
      detail: bundleAgo
        ? `Downloaded · ${bundleAgo}`
        : 'One Excel: costs, cash/AR, sales, operations',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-zarewa-teal tracking-tight">Close the month</h3>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          {branchLabel ? `${branchLabel} · ` : ''}
          {periodLabel}. Work the checklist, then download the bundle.
        </p>

        <ol className="mt-5 space-y-3">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/80 bg-white px-3 py-2.5"
            >
              <span className="text-ui-xs font-semibold text-slate-400 w-5">{i + 1}</span>
              {s.done ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" aria-hidden />
              ) : (
                <Circle size={18} className="text-slate-300 shrink-0" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                <p className="text-xs text-slate-500">{s.detail}</p>
              </div>
              {s.action ? (
                <button type="button" onClick={s.action} className="z-btn-secondary !text-xs !py-1.5">
                  {s.actionLabel}
                </button>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!periodValid || bundleBusy}
            onClick={onDownloadBundle}
            className="z-btn-primary justify-center min-h-10"
          >
            {bundleBusy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {bundleBusy ? 'Building bundle…' : 'Download month-end bundle'}
          </button>
          <button type="button" onClick={onGoExports} className="z-btn-secondary justify-center min-h-10">
            <Package size={16} />
            All downloads
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-3">Recommended for month-end</h4>
        <ReportsExportCatalog
          hasFinanceView={hasFinanceView}
          periodValid={periodValid}
          recommendedOnly
          onRequestExport={onRequestExport}
          lastDownloadMap={lastDownloadMap}
          busyId={busyId}
        />
      </div>
    </div>
  );
}
