import React, { useEffect, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { formatNgn } from '../../lib/formatNgn';
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

function resolveSumColumns(grouping) {
  if (Array.isArray(grouping?.sumColumns) && grouping.sumColumns.length) {
    return grouping.sumColumns.filter((d) => d?.key && d?.columnKey);
  }
  if (grouping?.subtotalKey) {
    return [
      {
        key: grouping.subtotalKey,
        columnKey: grouping.subtotalColumnKey || grouping.subtotalKey,
      },
    ];
  }
  return [];
}

function emptySums(sumDefs) {
  return Object.fromEntries(sumDefs.map((d) => [d.columnKey, 0]));
}

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
  const sumDefs = resolveSumColumns(grouping);
  const shouldGroup = Boolean(grouping?.groupBy && sumDefs.length);
  const addRowSums = (target, row) => {
    for (const d of sumDefs) {
      target[d.columnKey] = (target[d.columnKey] || 0) + parseNumeric(row[d.key]);
    }
  };
  const groupedRows = shouldGroup
    ? rows
        .reduce((acc, row) => {
          const key = String(row[grouping.groupBy] || 'Uncategorized');
          const existing = acc.find((g) => g.key === key);
          if (existing) {
            existing.rows.push(row);
            addRowSums(existing.sums, row);
          } else {
            const sums = emptySums(sumDefs);
            addRowSums(sums, row);
            acc.push({ key, rows: [row], sums });
          }
          return acc;
        }, [])
        .sort((a, b) => {
          const aRefund = a.key === 'Refunds paid' || /^refund/i.test(a.key);
          const bRefund = b.key === 'Refunds paid' || /^refund/i.test(b.key);
          if (aRefund !== bRefund) return aRefund ? 1 : -1;
          return String(a.key).localeCompare(String(b.key), undefined, { sensitivity: 'base' });
        })
        .map((g) => ({
          ...g,
          rows: g.rows.slice().sort((a, b) => {
            const d = String(a.date || '').localeCompare(String(b.date || ''));
            if (d !== 0) return d;
            return String(a.ref || a.expenseID || '').localeCompare(String(b.ref || b.expenseID || ''));
          }),
        }))
    : [];
  const overallSums = shouldGroup
    ? groupedRows.reduce((acc, g) => {
        for (const d of sumDefs) {
          acc[d.columnKey] = (acc[d.columnKey] || 0) + (g.sums[d.columnKey] || 0);
        }
        return acc;
      }, emptySums(sumDefs))
    : emptySums(sumDefs);
  const sumColKeys = new Set(sumDefs.map((d) => d.columnKey));
  const firstSumIdx = (() => {
    const indexes = columns
      .map((c, i) => (sumColKeys.has(c.key) ? i : -1))
      .filter((i) => i >= 0);
    return indexes.length ? Math.min(...indexes) : Math.max(0, columns.length - 1);
  })();

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
  const tdClass = (align, zebra, wrap) => {
    const base = align === 'right' ? `${STATEMENT_TD_NUM} report-print-num` : STATEMENT_TD;
    const zebraCls = zebra ? ' bg-slate-50/40' : '';
    const wrapCls = wrap ? ' whitespace-normal break-words' : '';
    return `${base}${zebraCls}${wrapCls}`;
  };

  const colStyle = (c) => {
    if (!c?.width && !c?.minWidth) return undefined;
    return { width: c.width, maxWidth: c.width, minWidth: c.minWidth };
  };

  const renderTotalsRow = (label, sums, emphasize = false) => {
    const labelUntil = firstSumIdx;
    const tone = emphasize ? ' report-print-grand-total' : '';
    const cells = [];
    let idx = 0;
    while (idx < columns.length) {
      const col = columns[idx];
      if (idx === 0 && labelUntil > 0) {
        cells.push(
          <td
            key="totals-label"
            colSpan={labelUntil}
            className={`${STATEMENT_TF} report-print-totals-label text-right${tone}`}
          >
            {label}
          </td>
        );
        idx = labelUntil;
        continue;
      }
      if (sumColKeys.has(col.key)) {
        const n = Number(sums[col.key]) || 0;
        const text = n ? formatNgn(n) : '—';
        cells.push(
          <td
            key={col.key}
            title={text !== '—' ? text : undefined}
            style={colStyle(col)}
            className={`${STATEMENT_TF_NUM} report-print-totals-num${tone}`}
          >
            {text}
          </td>
        );
      } else {
        cells.push(<td key={col.key} className={`${STATEMENT_TF}${tone}`} />);
      }
      idx += 1;
    }
    return <tr>{cells}</tr>;
  };

  const renderCells = (row, i, skipGroupKey = false) =>
    columns.map((c) => {
      const raw = skipGroupKey && c.key === grouping?.groupBy ? '' : row[c.key];
      const text = raw != null && raw !== '' ? String(raw) : '—';
      return (
        <td
          key={c.key}
          title={text !== '—' ? text : undefined}
          style={colStyle(c)}
          className={tdClass(c.align, i % 2 === 1, c.wrap)}
        >
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
              <th key={c.key} className={thClass(c.align)} style={colStyle(c)}>
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
                      className={`${STATEMENT_TF} report-print-totals-label uppercase tracking-wide`}
                    >
                      {grouping.groupLabel || 'Category'}: {group.key}
                    </td>
                  </tr>
                  {group.rows.map((row, i) => (
                    <tr key={`${group.key}-${i}`}>{renderCells(row, i, true)}</tr>
                  ))}
                  {renderTotalsRow(grouping.subtotalLabel || 'Subtotal', group.sums)}
                </React.Fragment>
              ))}
              {renderTotalsRow(grouping.totalLabel || 'Total', overallSums, true)}
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
