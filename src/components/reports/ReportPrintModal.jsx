import React, { useEffect, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { PrintModalPortal } from '../layout/PrintModalPortal';
import {
  StatementStyleReportShell,
  STATEMENT_TBL,
  STATEMENT_TH,
  STATEMENT_TD,
  STATEMENT_TD_NUM,
  STATEMENT_TF,
  STATEMENT_TF_NUM,
} from './StatementStyleReportShell';

/**
 * Statement-style management report sheet — same visual language as
 * Finance → treasury account statement (preview & print).
 *
 * @param {'portrait'|'landscape'} [props.layout]
 * @param {boolean} [props.denseSingleLine] — nowrap + ellipsis on cells (default true for neat equal rows)
 */
export function ManagementReportSheet({
  title,
  periodLabel,
  columns: columnsProp,
  rows: rowsProp,
  summaryLines = [],
  documentTypeLabel = 'Management report',
  layout = 'landscape',
  denseSingleLine = true,
  grouping = null,
  extraMetaLines = [],
}) {
  const columns = Array.isArray(columnsProp) ? columnsProp : [];
  const rows = Array.isArray(rowsProp) ? rowsProp : [];
  const generated = new Date().toLocaleString('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

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

  const reportLabel =
    documentTypeLabel &&
    String(documentTypeLabel).trim().toLowerCase() !== String(title || '').trim().toLowerCase()
      ? documentTypeLabel
      : null;

  const metaLines = [
    reportLabel ? { label: 'Report', value: reportLabel } : null,
    periodLabel ? { label: 'Period', value: periodLabel } : null,
    { label: 'Printed', value: generated },
    ...(Array.isArray(extraMetaLines) ? extraMetaLines : []),
    ...(Array.isArray(summaryLines) ? summaryLines : []),
  ].filter(Boolean);

  const thClass = (align) =>
    `${STATEMENT_TH}${align === 'right' ? ' text-right' : ''}`;
  const tdClass = (align, zebra) => {
    const base = align === 'right' ? STATEMENT_TD_NUM : STATEMENT_TD;
    const zebraCls = zebra ? ' bg-slate-50/40' : '';
    return `${base}${zebraCls}`;
  };

  const renderCells = (row, i, skipGroupKey = false) =>
    columns.map((c) => {
      const raw = skipGroupKey && c.key === grouping?.groupBy ? '' : row[c.key];
      const text = raw != null && raw !== '' ? String(raw) : '—';
      return (
        <td key={c.key} title={text !== '—' ? text : undefined} className={tdClass(c.align, i % 2 === 1)}>
          {text}
        </td>
      );
    });

  return (
    <StatementStyleReportShell title={title} metaLines={metaLines} layout={layout}>
      <table
        className={`report-print-table report-print-table--single-line statement-dense-table ${STATEMENT_TBL}`}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={thClass(c.align)}>
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
                className={`${STATEMENT_TD} text-center italic text-slate-500`}
              >
                No rows in this period.
              </td>
            </tr>
          ) : shouldGroup ? (
            <>
              {groupedRows.map((group, groupIdx) => (
                <React.Fragment key={`${group.key}-${groupIdx}`}>
                  <tr>
                    <td
                      colSpan={Math.max(1, columns.length)}
                      title={`${grouping.groupLabel || 'Category'}: ${group.key}`}
                      className={`${STATEMENT_TF} uppercase tracking-wide`}
                    >
                      {grouping.groupLabel || 'Category'}: {group.key}
                    </td>
                  </tr>
                  {group.rows.map((row, i) => (
                    <tr key={`${group.key}-${i}`}>{renderCells(row, i, true)}</tr>
                  ))}
                  <tr>
                    {columns.map((col, idx) => {
                      if (idx < subtotalColumnIndex) {
                        return <td key={col.key} className={STATEMENT_TD} />;
                      }
                      if (idx === subtotalColumnIndex) {
                        return (
                          <td key={col.key} className={STATEMENT_TF_NUM}>
                            {`${grouping.subtotalLabel || 'Subtotal'}: ${formatSubtotal(group.subtotal)}`}
                          </td>
                        );
                      }
                      return <td key={col.key} className={STATEMENT_TD} />;
                    })}
                  </tr>
                </React.Fragment>
              ))}
              <tr>
                {columns.map((col, idx) => {
                  if (idx < subtotalColumnIndex) {
                    return <td key={col.key} className={STATEMENT_TD} />;
                  }
                  if (idx === subtotalColumnIndex) {
                    return (
                      <td key={col.key} className={STATEMENT_TF_NUM}>
                        {`${grouping.totalLabel || 'Overall total'}: ${formatSubtotal(overallTotal)}`}
                      </td>
                    );
                  }
                  return <td key={col.key} className={STATEMENT_TD} />;
                })}
              </tr>
            </>
          ) : (
            rows.map((row, i) => <tr key={i}>{renderCells(row, i)}</tr>)
          )}
        </tbody>
      </table>
    </StatementStyleReportShell>
  );
}

/**
 * Body-portaled print preview — statement-style sheet (matches Finance account statement).
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
  layout = 'landscape',
  denseSingleLine = true,
  grouping = null,
  autoPrint = false,
  extraMetaLines = [],
}) {
  const printedRef = useRef(false);
  const isLandscape = layout !== 'portrait';
  const shellMaxClass = isLandscape ? 'max-w-[297mm]' : 'max-w-[210mm]';

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
            <p className="truncate text-sm font-bold text-zarewa-teal">{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => window.print()} className="z-btn-primary px-4 py-2.5">
              <Printer size={16} aria-hidden />
              Print
            </button>
            <button type="button" onClick={onClose} className="z-btn-secondary px-3 py-2.5" aria-label="Close">
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
            extraMetaLines={extraMetaLines}
          />
        </div>
      </div>
    </PrintModalPortal>
  );
}
