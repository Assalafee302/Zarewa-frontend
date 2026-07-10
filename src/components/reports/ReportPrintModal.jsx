import React, { useEffect, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { PrintModalPortal } from '../layout/PrintModalPortal';
import { StandardReportPrintShell } from './StandardReportPrintShell';

const TH_BASE =
  'px-2 py-1.5 text-left text-ui-xs font-bold uppercase tracking-wide text-slate-600 print:text-[8pt]';
const TD_BASE = 'px-2 py-1.5 align-top text-xs text-slate-800 print:text-[10pt]';

/**
 * A4 management report — use inside a wrapper with `report-print-root quotation-print-preview-mode` for @media print.
 * @param {'portrait'|'landscape'} [props.layout]
 * @param {boolean} [props.denseSingleLine] — nowrap + ellipsis on cells; use title for full value
 */
export function ManagementReportSheet({
  title,
  periodLabel,
  columns,
  rows,
  summaryLines = [],
  documentTypeLabel = 'Management report',
  layout = 'portrait',
  denseSingleLine = false,
  grouping = null,
}) {
  const generated = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const shellClass = layout === 'landscape' ? 'max-w-[297mm]' : 'max-w-4xl';

  const tableClass = [
    'report-print-table w-full border-collapse border border-slate-200',
    denseSingleLine ? 'report-print-table--single-line' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const parseNumeric = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const cleaned = String(value ?? '')
      .replace(/[^\d.-]/g, '')
      .trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };
  const formatSubtotal = (n) =>
    n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const shouldGroup = Boolean(grouping?.groupBy && grouping?.subtotalKey);
  const subtotalColumnIndex = shouldGroup
    ? Math.max(
        0,
        columns.findIndex((c) => c.key === (grouping.subtotalColumnKey || grouping.subtotalKey))
      )
    : 0;
  const groupedRows = shouldGroup
    ? rows.reduce((acc, row) => {
        const key = String(row[grouping.groupBy] || 'Uncategorized');
        const existing = acc.find((g) => g.key === key);
        if (existing) {
          existing.rows.push(row);
          existing.subtotal += parseNumeric(row[grouping.subtotalKey]);
        } else {
          acc.push({
            key,
            rows: [row],
            subtotal: parseNumeric(row[grouping.subtotalKey]),
          });
        }
        return acc;
      }, [])
    : [];
  const overallTotal = shouldGroup ? groupedRows.reduce((sum, g) => sum + g.subtotal, 0) : 0;

  return (
    <StandardReportPrintShell
      documentTypeLabel={documentTypeLabel}
      title={title}
      subtitle={periodLabel}
      watermarkText="RPT"
      shellClassName={shellClass}
      rightColumn={
        <>
          <p className="text-ui-xs font-semibold uppercase tracking-wide text-slate-500 print:text-[9pt]">Generated</p>
          <p className="mt-0.5 font-medium text-slate-900">{generated}</p>
        </>
      }
      footer="Confidential — internal operations summary. Figures reflect workspace snapshot at generation time."
    >
      <table className={tableClass}>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90">
            {columns.map((c) => (
              <th key={c.key} className={`${TH_BASE} ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={Math.max(1, columns.length)}
                className="border-b border-slate-100 px-2 py-4 text-center text-slate-500 italic print:text-[9pt]"
              >
                No rows in this period.
              </td>
            </tr>
          ) : shouldGroup ? (
            <>
              {groupedRows.map((group, groupIdx) => (
                <React.Fragment key={`${group.key}-${groupIdx}`}>
                  <tr className="border-b border-slate-200 bg-slate-100/80">
                    <td
                      colSpan={Math.max(1, columns.length)}
                      className="px-2 py-1.5 text-ui-xs font-black uppercase tracking-wide text-slate-700 print:text-[9pt]"
                    >
                      {grouping.groupLabel || 'Category'}: {group.key}
                    </td>
                  </tr>
                  {group.rows.map((row, i) => (
                    <tr key={`${group.key}-${i}`} className="report-print-tr quotation-print-line border-b border-slate-100">
                      {columns.map((c) => {
                        const raw = c.key === grouping.groupBy ? '' : row[c.key];
                        const text = raw != null && raw !== '' ? String(raw) : '—';
                        return (
                          <td
                            key={c.key}
                            title={denseSingleLine && text !== '—' ? text : undefined}
                            className={`${TD_BASE} ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${
                              i % 2 === 1 ? 'bg-slate-50/50' : ''
                            }`}
                          >
                            {text}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    {columns.map((col, idx) => {
                      if (idx < subtotalColumnIndex) {
                        return <td key={col.key} className="px-2 py-1.5" />;
                      }
                      if (idx === subtotalColumnIndex) {
                        return (
                          <td
                            key={col.key}
                            className="px-2 py-1.5 text-right text-ui-xs font-bold uppercase tracking-wide text-slate-600 print:text-[9pt]"
                          >
                            {`${grouping.subtotalLabel || 'Subtotal'}: ${formatSubtotal(group.subtotal)}`}
                          </td>
                        );
                      }
                      return <td key={col.key} className="px-2 py-1.5" />;
                    })}
                  </tr>
                </React.Fragment>
              ))}
              <tr className="border-b border-slate-300 bg-slate-100">
                {columns.map((col, idx) => {
                  if (idx < subtotalColumnIndex) {
                    return <td key={col.key} className="px-2 py-1.5" />;
                  }
                  if (idx === subtotalColumnIndex) {
                    return (
                      <td
                        key={col.key}
                        className="px-2 py-1.5 text-right text-ui-xs font-black uppercase tracking-wide text-slate-700 print:text-[9pt]"
                      >
                        {`${grouping.totalLabel || 'Overall total'}: ${formatSubtotal(overallTotal)}`}
                      </td>
                    );
                  }
                  return <td key={col.key} className="px-2 py-1.5" />;
                })}
              </tr>
            </>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="report-print-tr quotation-print-line border-b border-slate-100">
                {columns.map((c) => {
                  const raw = row[c.key];
                  const text = raw != null && raw !== '' ? String(raw) : '—';
                  return (
                    <td
                      key={c.key}
                      title={denseSingleLine && text !== '—' ? text : undefined}
                      className={`${TD_BASE} ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${
                        i % 2 === 1 ? 'bg-slate-50/50' : ''
                      }`}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {summaryLines.length > 0 ? (
        <ul className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-ui-xs text-slate-700 print:text-[9pt]">
          {summaryLines.map((line, idx) => (
            <li key={idx} className="flex justify-between gap-4 font-semibold">
              <span className="text-slate-600">{line.label}</span>
              <span className="shrink-0 tabular-nums text-slate-900">{line.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </StandardReportPrintShell>
  );
}

/**
 * Body-portaled print preview — matches StockRegisterPrintModal / PurchaseReportPrintModal
 * so @media print renders the same content as on-screen preview (A4 landscape included).
 */
export function ReportPrintModal({
  isOpen,
  onClose,
  title,
  periodLabel,
  columns,
  rows,
  summaryLines,
  documentTypeLabel,
  layout = 'portrait',
  denseSingleLine = false,
  grouping = null,
  autoPrint = false,
}) {
  const printedRef = useRef(false);
  const isLandscape = layout === 'landscape';
  const shellMaxClass = isLandscape ? 'max-w-[297mm]' : 'max-w-5xl';

  useEffect(() => {
    if (!isOpen || !autoPrint || printedRef.current) return;
    printedRef.current = true;
    const t = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(t);
  }, [isOpen, autoPrint]);

  useEffect(() => {
    if (!isOpen) printedRef.current = false;
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const innerRootClass = [
    'report-print-root quotation-print-preview-mode rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none',
    isLandscape ? 'report-print-a4-landscape' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <PrintModalPortal open={isOpen} onClose={onClose}>
      <div className={`mx-auto ${shellMaxClass} pb-16`}>
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Print preview</p>
            <p className="text-sm font-bold text-zarewa-teal truncate">{title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => window.print()} className="z-btn-primary py-2.5 px-4">
              <Printer size={16} aria-hidden />
              Print
            </button>
            <button type="button" onClick={onClose} className="z-btn-secondary py-2.5 px-3" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className={innerRootClass}>
          <ManagementReportSheet
            title={title}
            periodLabel={periodLabel}
            columns={columns}
            rows={rows}
            summaryLines={summaryLines}
            documentTypeLabel={documentTypeLabel}
            layout={layout}
            denseSingleLine={denseSingleLine}
            grouping={grouping}
          />
        </div>
      </div>
    </PrintModalPortal>
  );
}
