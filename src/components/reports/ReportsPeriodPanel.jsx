import React from 'react';
import { formatNgn } from '../../Data/mockData';

const SUBHDR = 'z-section-title mb-4';

export function ReportsPeriodPanel({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  salesKpis,
  onDownloadMonthEndBundle,
}) {
  return (
    <div className="z-page-hero !mb-0">
      <div className="max-w-4xl">
        <h3 className={SUBHDR}>Report period</h3>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rep-start" className="z-field-label">
                Start date
              </label>
              <input
                id="rep-start"
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="z-input"
              />
            </div>
            <div>
              <label htmlFor="rep-end" className="z-field-label">
                End date
              </label>
              <input
                id="rep-end"
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="z-input"
              />
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed -mt-2">
            Most exports filter by these dates.{' '}
            <span className="font-semibold text-slate-700">Quotation totals</span> are pipeline only — not revenue.{' '}
            <span className="font-semibold text-slate-700">Sales</span> here means production-attributed value when
            cutting lists complete in the period. Cash receipts are period cash, not the same as sales.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onDownloadMonthEndBundle} className="z-btn-primary !text-xs">
              Download month-end bundle (Excel)
            </button>
            <span className="text-ui-xs text-slate-500 self-center">
              One workbook: costs &amp; inventory, cash/bank/AR, sales &amp; customer, operations &amp; procurement.
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-ui-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Quotation pipeline (quote date)
              </p>
              <p className="text-xl font-black text-zarewa-teal tabular-nums">
                {formatNgn(salesKpis.quotationPipelineNgn)}
              </p>
              <p className="text-xs text-slate-500 mt-2 font-medium">{salesKpis.rowCount} quotations · not sales</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-ui-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Revenue at production completion
              </p>
              <p className="text-xl font-black text-teal-800 tabular-nums">{formatNgn(salesKpis.producedSalesNgn)}</p>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {salesKpis.productionJobsCompletedInRange} job(s) completed in range
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-ui-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Receipts (cash in period)
              </p>
              <p className="text-xl font-black text-emerald-700 tabular-nums">{formatNgn(salesKpis.totalPaid)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-ui-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Receivables outstanding (Policy v1)
              </p>
              <p className="text-xl font-black text-amber-700 tabular-nums">{formatNgn(salesKpis.outstanding)}</p>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Post-production balance due only · not quotation-date order book
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
