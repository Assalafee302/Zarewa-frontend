import React, { useState } from 'react';
import { formatNgn } from '../../Data/mockData';
import { ChevronDown } from 'lucide-react';
import { KPI_EXPORT_MAP } from '../../lib/reportsExportCatalog.js';

/**
 * Optional compact KPI strip — collapsed by default; tiles deep-link to exports.
 */
export function ReportsKpiStrip({ salesKpis, onExportKpi }) {
  const [open, setOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  if (!salesKpis) return null;

  const tiles = [
    {
      key: 'pipeline',
      label: 'Pipeline',
      value: formatNgn(salesKpis.quotationPipelineNgn),
      hint:
        salesKpis.rowCount > 0
          ? `${salesKpis.rowCount} quotations · not revenue`
          : 'No quotations in this period',
      empty: !(Number(salesKpis.quotationPipelineNgn) > 0),
    },
    {
      key: 'produced',
      label: 'Produced revenue',
      value: formatNgn(salesKpis.producedSalesNgn),
      hint:
        salesKpis.productionJobsCompletedInRange > 0
          ? `${salesKpis.productionJobsCompletedInRange} job(s) completed`
          : 'No completed jobs in this period',
      empty: !(Number(salesKpis.producedSalesNgn) > 0),
    },
    {
      key: 'cash',
      label: 'Cash in',
      value: formatNgn(salesKpis.totalPaid),
      hint: Number(salesKpis.totalPaid) > 0 ? 'Receipts in period' : 'No receipts in this period',
      empty: !(Number(salesKpis.totalPaid) > 0),
    },
    {
      key: 'ar',
      label: 'AR due',
      value: formatNgn(salesKpis.outstanding),
      hint: 'Amount still owed after production',
      empty: !(Number(salesKpis.outstanding) > 0),
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-slate-800">Period snapshot</span>
        <span className="inline-flex items-center gap-1 text-ui-xs font-semibold text-teal-800">
          {open ? 'Hide' : 'Show'}
          <ChevronDown size={14} className={open ? 'rotate-180' : ''} aria-hidden />
        </span>
      </button>
      {open ? (
        <div className="px-3 pb-3 border-t border-slate-100 pt-3 space-y-3">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {tiles.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => onExportKpi?.(KPI_EXPORT_MAP[t.key], t.label)}
                className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-left hover:border-teal-200 transition-colors"
                title={`Export report for ${t.label}`}
              >
                <p className="text-ui-xs font-semibold text-slate-500">{t.label}</p>
                <p
                  className={`text-base font-bold tabular-nums mt-0.5 ${
                    t.empty ? 'text-slate-400' : 'text-zarewa-teal'
                  }`}
                >
                  {t.value}
                </p>
                <p className="text-ui-xs text-slate-500 mt-1">{t.hint}</p>
                <p className="text-ui-xs font-semibold text-teal-800 mt-1.5">Export →</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-ui-xs font-semibold text-slate-500 hover:text-teal-800"
            onClick={() => setGlossaryOpen((v) => !v)}
          >
            {glossaryOpen ? 'Hide glossary' : 'What do these mean?'}
          </button>
          {glossaryOpen ? (
            <ul className="text-xs text-slate-600 space-y-1.5 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <li>
                <span className="font-semibold text-slate-800">Pipeline</span> — open quotations by quote date; not
                sales.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Produced revenue</span> — value when cutting lists /
                jobs complete in the period.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Cash in</span> — customer receipts dated in the period.
              </li>
              <li>
                <span className="font-semibold text-slate-800">AR due</span> — post-production balance still owed (not
                the quotation order book).
              </li>
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
