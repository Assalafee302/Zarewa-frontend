import React, { useMemo } from 'react';
import { ZAREWA_QUOTATION_BRANDING } from '../Data/companyQuotation';
import { formatNgn } from '../Data/mockData';
import { receiptCashReceivedNgn, receiptLedgerReceiptTreasurySplits } from '../lib/salesReceiptsList';

export {
  CUTTING_LIST_A4_LANDSCAPE_ROWS_PER_PAGE,
  CUTTING_LIST_REPORT_ROWS_PER_PAGE,
} from './cuttingListReportConstants';

const LINE_CATEGORIES = [
  { type: 'Roof', title: 'Roofing sheet' },
  { type: 'Flatsheet', title: 'Flat sheet' },
  { type: 'Cladding', title: 'Cladding' },
];

/** Full cutting list (factory pane): roof, flat sheet, cladding. */
const PRINT_CUT_LINE_CATEGORIES = LINE_CATEGORIES;

/** Waybill cut tables and cargo sheet counts: roofing + cladding only (flat sheet is factory-only). */
const WAYBILL_CUT_LINE_CATEGORIES = [
  { type: 'Roof', title: 'Roofing sheet' },
  { type: 'Cladding', title: 'Cladding' },
];

function parseNum(value) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '₦0.00';
  return `₦${v.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function lineValueNgn(row) {
  return parseNum(row.qty) * parseNum(row.unitPrice);
}

function sumLineRows(rows) {
  return (rows ?? []).reduce((s, r) => s + lineValueNgn(r), 0);
}

/** Hide quotation lines with no usable label or commercial qty/value (print only). */
function billingRowsWithContent(rows) {
  return (rows ?? []).filter((r) => {
    const name = String(r?.name ?? '').trim();
    if (!name) return false;
    const q = parseNum(r.qty);
    const v = lineValueNgn(r);
    return q > 0 || v > 0;
  });
}

function flattenCuttingLinesByCategories(linesByCat, categories) {
  const out = [];
  for (const { type } of categories) {
    const bucket = linesByCat?.[type] ?? [];
    for (const line of bucket) {
      const sheets = parseNum(line.sheets);
      const lengthM = parseNum(line.lengthM);
      if (sheets > 0 && lengthM > 0) {
        out.push({ type, sheets, lengthM, id: line.id });
      }
    }
  }
  return out;
}

function groupByType(lines) {
  const m = { Roof: [], Flatsheet: [], Cladding: [] };
  for (const line of lines) {
    if (m[line.type]) m[line.type].push(line);
  }
  return m;
}

/** Same length (m) within the same sheet category → one row with summed qty; then longest first. */
function mergeCuttingLinesByLengthDesc(flatLines, categories = LINE_CATEGORIES) {
  const byType = groupByType(flatLines);
  const out = [];
  for (const { type } of categories) {
    const bucket = byType[type] ?? [];
    if (!bucket.length) continue;
    const byLen = new Map();
    for (const line of bucket) {
      const len = parseNum(line.lengthM);
      if (!(len > 0)) continue;
      const key = len;
      const prev = byLen.get(key);
      if (prev) {
        prev.sheets += parseNum(line.sheets);
      } else {
        byLen.set(key, {
          type,
          sheets: parseNum(line.sheets),
          lengthM: len,
          id: `agg-${type}-${key}`,
        });
      }
    }
    const merged = Array.from(byLen.values()).sort((a, b) => b.lengthM - a.lengthM);
    out.push(...merged);
  }
  return out;
}

/** Products, accessories, and services in one table (single list, no category blocks). */
function QuotationLinesOneTable({ rows, grandTotal }) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    return <p className="cl-factory-cut-empty text-ui-xs">No quotation line items.</p>;
  }
  return (
    <div className="cl-factory-bill-block cl-factory-bill-block--flat">
      <div className="cl-factory-table-shell">
        <table className="cl-factory-bill-table w-full border-collapse">
          <thead>
            <tr>
              <th className="cl-factory-bill-th text-left">Item</th>
              <th className="cl-factory-bill-th text-right">Qty</th>
              <th className="cl-factory-bill-th text-right">Unit</th>
              <th className="cl-factory-bill-th text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row, ri) => (
              <tr key={row.id ?? `qline-${row.name}-${ri}`}>
                <td className="cl-factory-bill-td">{row.name}</td>
                <td className="cl-factory-bill-td text-right tabular-nums">{row.qty}</td>
                <td className="cl-factory-bill-td text-right tabular-nums">{formatMoney(parseNum(row.unitPrice))}</td>
                <td className="cl-factory-bill-td text-right tabular-nums cl-factory-bill-td-amount">{formatMoney(lineValueNgn(row))}</td>
              </tr>
            ))}
            <tr className="cl-factory-bill-subtotal-row">
              <td colSpan={3} className="cl-factory-bill-td cl-factory-bill-subtotal-label">
                Grand total
              </td>
              <td className="cl-factory-bill-td text-right tabular-nums cl-factory-bill-subtotal-value">{formatMoney(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FactoryRefLine({ cuttingListId, cutDate, quotationRef, ariaLabel = 'References' }) {
  return (
    <div className="cl-factory-banner-refline" aria-label={ariaLabel}>
      <span className="cl-factory-ref-group">
        <span className="cl-factory-ref-k">List</span>
        <span className="cl-factory-ref-v cl-factory-ref-v--id font-mono">{cuttingListId}</span>
      </span>
      <span className="cl-factory-ref-sep">·</span>
      <span className="cl-factory-ref-group">
        <span className="cl-factory-ref-k">Date</span>
        <span className="cl-factory-ref-v">{cutDate}</span>
      </span>
      <span className="cl-factory-ref-sep">·</span>
      <span className="cl-factory-ref-group">
        <span className="cl-factory-ref-k">Quotation</span>
        <span className="cl-factory-ref-v cl-factory-ref-v--id font-mono">{quotationRef || '—'}</span>
      </span>
    </div>
  );
}

function WaybillBranchesBlock({ branches, compact }) {
  const list = branches ?? [];
  if (!list.length) return null;
  return (
    <div className={compact ? 'cl-waybill-branches-block--compact' : 'cl-waybill-section cl-waybill-section--branches'}>
      {!compact ? <p className="cl-waybill-section-title">Zarewa branches</p> : null}
      <div className={compact ? 'cl-waybill-branches-stack cl-waybill-branches-stack--compact-row' : 'cl-waybill-branches-stack'}>
        {list.map((br) => (
          <div key={br.title} className="cl-waybill-branch-card">
            <p className="cl-waybill-branch-heading">{br.title}</p>
            {br.lines.map((ln, i) => (
              <p key={i} className="cl-waybill-branch-line">
                {ln}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function WaybillCutConfirmBlock({ grouped, cutStartIndex, fullRightColumn, categories }) {
  const startIndexByType = {};
  let running = cutStartIndex;
  for (const { type } of categories) {
    startIndexByType[type] = running;
    running += (grouped[type] ?? []).length;
  }
  const anyLines = categories.some(({ type }) => (grouped[type] ?? []).length > 0);
  const grandMeters = categories.reduce(
    (sum, { type }) =>
      sum + (grouped[type] ?? []).reduce((catSum, line) => catSum + line.sheets * line.lengthM, 0),
    0
  );
  return (
    <div
      className={
        fullRightColumn
          ? 'cl-waybill-section cl-waybill-section--cut-confirm cl-waybill-section--cuts-full-column'
          : 'cl-waybill-section cl-waybill-section--cut-confirm'
      }
    >
      <div className="cl-waybill-cut-tables cl-factory-panel--cut-list">
        {categories.map(({ type, title }) => {
          const slice = grouped[type];
          if (!slice?.length) return null;
          const block = (
            <CuttingCategoryTable title={title} lines={slice} startIndex={startIndexByType[type]} />
          );
          return <div key={type}>{block}</div>;
        })}
        {anyLines ? (
          <p className="cl-factory-cut-empty font-bold text-right">
            Grand total metres: {grandMeters.toLocaleString('en-NG', { maximumFractionDigits: 2 })} m
          </p>
        ) : null}
        {!anyLines ? <p className="cl-factory-cut-empty">No cutting lines on this section.</p> : null}
      </div>
    </div>
  );
}

function WaybillPanel({
  b,
  cuttingListId,
  quotationRef,
  cutDate,
  selectedQuotation,
  materialInfoValue,
  waybillAccessories = [],
  sheetsToCut,
  totalMeters,
  continuation,
  chunkIndex,
  totalChunks,
  grouped,
  cutStartIndex,
  waybillCategories = WAYBILL_CUT_LINE_CATEGORIES,
}) {
  const customer = selectedQuotation?.customer ?? '—';
  const project = selectedQuotation?.projectName ?? '—';
  const metersLabel = typeof totalMeters === 'number' ? totalMeters.toLocaleString() : String(totalMeters ?? '—');
  const sheetsLabel = typeof sheetsToCut === 'number' ? sheetsToCut.toLocaleString() : String(sheetsToCut ?? '—');

  return (
    <div className="cl-waybill-root">
      <header className="cl-factory-banner cl-factory-banner--waybill-pane cl-waybill-banner--top">
        <div className="cl-factory-banner-accent" aria-hidden />
        <div className="cl-factory-banner-inner cl-factory-banner-inner--balanced">
          <div className="cl-factory-banner-side">
            <div className="cl-factory-logo-ring">
              <img src={b.logoSrc} alt="" className="cl-factory-logo-img" />
            </div>
          </div>
          <div className="cl-factory-banner-titles cl-factory-banner-titles--center">
            <p className="cl-factory-legal-name">{b.legalName}</p>
            <h1 className="cl-factory-doc-title">Waybill</h1>
          </div>
          <div className="cl-factory-banner-side cl-factory-banner-side--spacer" aria-hidden />
        </div>
        {continuation ? (
          <p className="cl-waybill-continuation-strip">
            Continuation {chunkIndex + 1}/{totalChunks} — attach to sheet 1. Commercial summary is on the first page only.
          </p>
        ) : null}
      </header>

      <div className="cl-waybill-body cl-factory-panel cl-factory-panel--waybill">
        <div className="cl-waybill-mid-split" aria-label="Waybill left column and material check">
          <div className="cl-waybill-col cl-waybill-col--addresses">
            <div className="cl-waybill-branches-in-left">
              <WaybillBranchesBlock branches={b.branches} compact />
            </div>

            <div className="cl-waybill-section">
              <p className="cl-waybill-section-title">Cargo summary</p>
              <dl className="cl-waybill-dl">
                <dt>Cutting list</dt>
                <dd className="font-mono font-semibold">{cuttingListId}</dd>
                <dt>Date</dt>
                <dd>{cutDate}</dd>
                <dt>Quotation</dt>
                <dd className="font-mono font-semibold">{quotationRef || '—'}</dd>
                <dt>Customer</dt>
                <dd>{customer}</dd>
                <dt>Project</dt>
                <dd>{project}</dd>
                <dt>Material</dt>
                <dd>{materialInfoValue}</dd>
                {waybillAccessories.length > 0 ? (
                  <>
                    <dt>Accessories</dt>
                    <dd>
                      <span className="cl-waybill-accessories-included">Included</span>
                      <span className="cl-waybill-accessories-list">{waybillAccessories.join(' · ')}</span>
                    </dd>
                  </>
                ) : null}
                <dt>Sheet</dt>
                <dd className="tabular-nums">{sheetsLabel}</dd>
                <dt>Metres</dt>
                <dd className="tabular-nums">{metersLabel} m</dd>
              </dl>
            </div>

            <div className="cl-waybill-section">
              <p className="cl-waybill-section-title">Transport</p>
              <div className="cl-waybill-labeled-lines">
                <div>
                  <span className="cl-factory-field-label">Vehicle reg.</span>
                  <div className="cl-factory-write-line" />
                </div>
                <div>
                  <span className="cl-factory-field-label">Driver / phone</span>
                  <div className="cl-factory-write-line" />
                </div>
              </div>
            </div>

            <div className="cl-waybill-section cl-waybill-section--signoff">
              <p className="cl-waybill-section-title">Received at site</p>
              <div className="cl-waybill-labeled-lines">
                <div>
                  <span className="cl-factory-field-label">Received by (print)</span>
                  <div className="cl-factory-write-line" />
                </div>
                <div className="cl-waybill-sign-row">
                  <div className="cl-waybill-sign-cell">
                    <div className="cl-factory-sign-line cl-factory-sign-line--waybill" />
                    <p className="cl-factory-sign-label">Signature</p>
                  </div>
                  <div className="cl-waybill-sign-cell cl-waybill-sign-cell--date">
                    <div className="cl-factory-sign-line cl-factory-sign-line--waybill" />
                    <p className="cl-factory-sign-label">Date / time</p>
                  </div>
                </div>
                <div>
                  <span className="cl-factory-field-label">Remarks</span>
                  <div className="cl-factory-write-line" />
                  <div className="cl-factory-write-line cl-waybill-write-gap" />
                </div>
              </div>
            </div>
          </div>

          <div className="cl-waybill-col cl-waybill-col--cuts">
            <WaybillCutConfirmBlock
              grouped={grouped}
              cutStartIndex={cutStartIndex}
              fullRightColumn
              categories={waybillCategories}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CuttingCategoryTable({ title, lines, startIndex }) {
  if (!lines?.length) return null;
  const catM = lines.reduce((s, line) => s + line.sheets * line.lengthM, 0);
  const catSheets = lines.reduce((s, line) => s + line.sheets, 0);
  return (
    <div className="cl-factory-cut-block">
      <div className="cl-factory-cut-title-bar">
        <span className="cl-factory-cut-title-icon" aria-hidden />
        <p className="cl-factory-cut-title">{title}</p>
      </div>
      <div className="cl-factory-table-shell cl-factory-table-shell--cut">
        <table className="cl-factory-cut-table w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className="cl-factory-cut-th text-right w-[34%]">Length (m)</th>
            <th className="cl-factory-cut-th text-right w-[30%]">Qty</th>
            <th className="cl-factory-cut-th text-right w-[18%]">Total m</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const lineM = line.sheets * line.lengthM;
            return (
              <tr key={line.id ?? `r-${title}-${line.lengthM}-${startIndex + i}`}>
                <td className="cl-factory-cut-td text-right tabular-nums">{line.lengthM}</td>
                <td className="cl-factory-cut-td text-right tabular-nums">{line.sheets}</td>
                <td className="cl-factory-cut-td text-right tabular-nums">{lineM.toLocaleString('en-NG', { maximumFractionDigits: 2 })}</td>
              </tr>
            );
          })}
          <tr className="cl-factory-cut-total-row">
            <td className="cl-factory-cut-td text-right font-bold">Total</td>
            <td className="cl-factory-cut-td text-right font-bold tabular-nums">
              {catSheets.toLocaleString('en-NG')}
            </td>
            <td className="cl-factory-cut-td text-right font-bold tabular-nums">
              {catM.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
}

function ProductionScratchpad() {
  return (
    <div className="cl-factory-scratch">
      <p className="cl-factory-scratch-title">
        <span className="cl-factory-scratch-title-mark" aria-hidden />
        Production record <span className="cl-factory-scratch-sub">manual · coil / conversion</span>
      </p>
      <div className="cl-factory-scratch-grid cl-factory-scratch-grid--prominent">
        <div>
          <span className="cl-factory-field-label">Production ID</span>
          <div className="cl-factory-write-line" />
        </div>
        <div className="cl-factory-scratch-row3">
          <span className="cl-factory-field-label">Coil no.</span>
          <span className="cl-factory-field-label text-center">Before (m / kg)</span>
          <span className="cl-factory-field-label text-center">After (m / kg)</span>
          <div className="cl-factory-write-line" />
          <div className="cl-factory-write-line" />
          <div className="cl-factory-write-line" />
        </div>
        <div className="cl-factory-scratch-row3">
          <div>
            <span className="cl-factory-field-label">KG</span>
            <div className="cl-factory-write-line" />
          </div>
          <div>
            <span className="cl-factory-field-label">Off cut</span>
            <div className="cl-factory-write-line" />
          </div>
          <div>
            <span className="cl-factory-field-label">Conversion</span>
            <div className="cl-factory-write-line" />
          </div>
        </div>
        <div>
          <span className="cl-factory-field-label">Metres produced</span>
          <div className="cl-factory-write-line" />
        </div>
        <div>
          <span className="cl-factory-field-label">Date &amp; time</span>
          <div className="cl-factory-write-line" />
        </div>
        <div className="grid grid-cols-2 gap-1 mt-0">
          <div>
            <span className="cl-factory-field-label">Operator</span>
            <div className="cl-factory-write-line" />
          </div>
          <div>
            <span className="cl-factory-field-label">Store keeper</span>
            <div className="cl-factory-write-line" />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatPrintAuditWhen(iso) {
  const raw = String(iso ?? '').trim();
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 16);
  return d.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PrintAuditFooter({ printCount = 0, lastPrintedAtISO = '', lastPrintedBy = '' }) {
  const n = Math.max(0, Number(printCount) || 0);
  const when = formatPrintAuditWhen(lastPrintedAtISO);
  const by = String(lastPrintedBy ?? '').trim();
  return (
    <footer className="cl-factory-print-audit" aria-label="Print audit">
      <span className="cl-factory-print-audit-k">Print audit</span>
      <span className="cl-factory-print-audit-sep">·</span>
      <span>
        Times printed: <strong className="tabular-nums">{n.toLocaleString('en-NG')}</strong>
      </span>
      {when ? (
        <>
          <span className="cl-factory-print-audit-sep">·</span>
          <span>Last print: {when}</span>
        </>
      ) : null}
      {by ? (
        <>
          <span className="cl-factory-print-audit-sep">·</span>
          <span>By: {by}</span>
        </>
      ) : null}
    </footer>
  );
}

function ReceiptPaymentBlock({ receipt, treasuryMovements }) {
  const splits = receiptLedgerReceiptTreasurySplits(receipt, treasuryMovements);
  const total = receiptCashReceivedNgn(receipt);
  return (
    <div className="cl-factory-receipt-block">
      <div className="cl-factory-receipt-row">
        <span className="cl-factory-receipt-id font-mono">{receipt.id}</span>
        <span className="cl-factory-receipt-sep">·</span>
        <span className="cl-factory-receipt-date">{receipt.date ?? receipt.dateISO}</span>
        <span className="cl-factory-receipt-sep">·</span>
        <span className="cl-factory-receipt-amt tabular-nums">{formatNgn(total)}</span>
        <span className="cl-factory-receipt-sep">·</span>
        <span className="cl-factory-receipt-bank">{receipt.bankReference || receipt.method || receipt.paymentMethod || '—'}</span>
      </div>
      {splits.length > 0 ? (
        <ul className="cl-factory-receipt-splits">
          {splits.map((s) => (
            <li key={s.movementId} className="cl-factory-receipt-split-line">
              <span>{s.accountLabel}</span>
              <span className="tabular-nums">{formatNgn(s.amountNgn)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Factory cutting list — A4 landscape: left half = cutting + commercial pack; right half = matching waybill.
 */
export default function CuttingListReportPrintView({
  cuttingListId,
  quotationRef,
  selectedQuotation,
  materialSpec,
  materialTypeLabel = '',
  dateISO,
  linesByCat,
  receiptsForQuotation = [],
  productionFooterName = '',
  treasuryMovements = [],
  /** When true, omit the Cladding block from cut tables and waybill (non–stone-meter lists rarely need this). */
  omitCladdingSection = false,
  /** When set (e.g. "Stone flatsheet"), replaces the Cladding table title on print / waybill. */
  claddingSectionTitle = '',
  printCount = 0,
  lastPrintedAtISO = '',
  lastPrintedBy = '',
}) {
  const b = ZAREWA_QUOTATION_BRANDING;

  const printCutCategories = useMemo(() => {
    const base = omitCladdingSection
      ? PRINT_CUT_LINE_CATEGORIES.filter((c) => c.type !== 'Cladding')
      : PRINT_CUT_LINE_CATEGORIES;
    const t = String(claddingSectionTitle || '').trim();
    if (!t) return base;
    return base.map((c) => (c.type === 'Cladding' ? { ...c, title: t } : c));
  }, [claddingSectionTitle, omitCladdingSection]);

  const waybillCutCategories = useMemo(() => {
    const base = omitCladdingSection
      ? WAYBILL_CUT_LINE_CATEGORIES.filter((c) => c.type !== 'Cladding')
      : WAYBILL_CUT_LINE_CATEGORIES;
    const t = String(claddingSectionTitle || '').trim();
    if (!t) return base;
    return base.map((c) => (c.type === 'Cladding' ? { ...c, title: t } : c));
  }, [claddingSectionTitle, omitCladdingSection]);

  const flatLines = mergeCuttingLinesByLengthDesc(
    flattenCuttingLinesByCategories(linesByCat, printCutCategories),
    printCutCategories
  );
  const flatLinesWaybill = mergeCuttingLinesByLengthDesc(
    flattenCuttingLinesByCategories(linesByCat, waybillCutCategories),
    waybillCutCategories
  );

  const chunk = flatLines.length > 0 ? flatLines : [];
  const grouped = groupByType(chunk);
  const cutStartIndexByType = {};
  {
    let running = 0;
    for (const { type } of printCutCategories) {
      cutStartIndexByType[type] = running;
      running += (grouped[type] ?? []).length;
    }
  }

  const printSheetsWaybill = flatLinesWaybill.reduce((s, l) => s + l.sheets, 0);
  const printMetresWaybill = flatLinesWaybill.reduce((s, l) => s + l.sheets * l.lengthM, 0);

  const ql = selectedQuotation?.quotationLines;
  const products = ql?.products ?? [];
  const accessoryRows = billingRowsWithContent(ql?.accessories ?? []);
  const mergedQuotationLineRows = [
    ...billingRowsWithContent(products),
    ...accessoryRows,
    ...billingRowsWithContent(ql?.services ?? []),
  ];
  const grand = sumLineRows(mergedQuotationLineRows);
  const waybillAccessories = accessoryRows
    .map((r) => String(r.name ?? '').trim())
    .filter(Boolean);

  const materialLine = [
    materialSpec?.profile || selectedQuotation?.materialDesign,
    materialSpec?.colour || selectedQuotation?.materialColor,
    materialSpec?.gauge || selectedQuotation?.materialGauge,
  ]
    .filter(Boolean)
    .join(', ');

  const typeFromMaster = String(materialTypeLabel ?? '').trim();
  const materialTypeLine = typeFromMaster || '—';
  const materialSpecLine = materialLine || '';
  const materialInfoValue = [typeFromMaster, materialLine].filter(Boolean).join(' · ') || '—';

  const cutDate = dateISO || selectedQuotation?.dateISO || '—';
  const customerName =
    String(selectedQuotation?.customer ?? selectedQuotation?.customer_name ?? '').trim() || '—';
  const projectName = String(selectedQuotation?.projectName ?? '').trim() || '—';

  const waybillShared = {
    b,
    cuttingListId,
    quotationRef,
    cutDate,
    selectedQuotation,
    materialInfoValue,
    waybillAccessories,
    sheetsToCut: printSheetsWaybill,
    totalMeters: printMetresWaybill,
    totalChunks: 1,
  };

  return (
    <div
      className="cutting-list-a4-landscape-report-root cutting-list-factory-root cl-factory-theme bg-white text-slate-900 antialiased"
      data-print-profile="cutting-list-a4-landscape"
      data-print-paper="A4"
      data-print-orientation="landscape"
      data-print-sections="1"
    >
      <section className="cutting-list-a4-landscape-sheet">
        <div className="cl-a4-landscape-split">
          <div className="cl-a4-pane cl-a4-pane--cutting">
            <div className="cl-factory-body cl-factory-body--cut-first cl-factory-body--a4-landscape-left">
              <div className="cl-factory-col-commercial cl-factory-panel min-w-0">
                <div className="cl-factory-commercial-sheet-head shrink-0">
                  <header className="cl-factory-banner cl-factory-banner--a4-cut-grid cl-factory-banner--a4-cut-grid--over-commercial shrink-0">
                    <div className="cl-factory-banner-accent" aria-hidden />
                    <div className="cl-factory-banner-inner cl-factory-banner-inner--balanced">
                      <div className="cl-factory-banner-side">
                        <div className="cl-factory-logo-ring">
                          <img src={b.logoSrc} alt="" className="cl-factory-logo-img" />
                        </div>
                      </div>
                      <div className="cl-factory-banner-titles cl-factory-banner-titles--center">
                        <p className="cl-factory-legal-name">{b.legalName}</p>
                        <h1 className="cl-factory-doc-title">Cutting list</h1>
                      </div>
                      <div className="cl-factory-banner-side cl-factory-banner-side--spacer" aria-hidden />
                    </div>
                  </header>
                  <div className="cl-factory-commercial-meta shrink-0">
                    <FactoryRefLine
                      cuttingListId={cuttingListId}
                      cutDate={cutDate}
                      quotationRef={quotationRef}
                      ariaLabel="Cutting list references"
                    />
                    <div className="cl-factory-subbar cl-factory-subbar--double">
                      <span className="cl-factory-subbar-seg cl-factory-subbar-seg--stacked">
                        <span className="cl-factory-subbar-line">
                          <span className="cl-factory-subbar-k">Customer</span>
                          <span className="cl-factory-subbar-v">{customerName}</span>
                        </span>
                        <span className="cl-factory-subbar-line">
                          <span className="cl-factory-subbar-k">Project</span>
                          <span className="cl-factory-subbar-v">{projectName}</span>
                        </span>
                      </span>
                      <span className="cl-factory-subbar-seg cl-factory-subbar-seg--material">
                        <span className="cl-factory-subbar-v cl-factory-subbar-v--material-primary">
                          {materialTypeLine}
                        </span>
                        {materialSpecLine ? (
                          <span className="cl-factory-subbar-v cl-factory-subbar-v--material-secondary">
                            {materialSpecLine}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="cl-factory-commercial-filler">
                  <QuotationLinesOneTable rows={mergedQuotationLineRows} grandTotal={grand} />

                  <div className="cl-factory-receipt-box">
                    <p className="cl-factory-receipt-head">Payment &amp; receipts</p>
                    {receiptsForQuotation.length === 0 ? (
                      <p className="cl-factory-receipt-empty">No receipts on file.</p>
                    ) : (
                      receiptsForQuotation.map((r) => (
                        <ReceiptPaymentBlock key={r.id} receipt={r} treasuryMovements={treasuryMovements} />
                      ))
                    )}
                  </div>

                  <div className="cl-factory-scratch-anchor cl-factory-scratch-anchor--after-receipts">
                    <ProductionScratchpad />
                  </div>

                  <div
                    className="cl-factory-sheet-signfoot cl-factory-sheet-signfoot--a4-cutting-pane cl-factory-sheet-signfoot--stacked cl-factory-sheet-signfoot--commercial-col shrink-0"
                    aria-label="Prepared by and signature"
                  >
                    <div className="cl-factory-prepared-by-footer" aria-label="Cutting list prepared by">
                      <span className="cl-factory-created-by-k">Cutting list prepared by</span>
                      <span className="cl-factory-created-by-v">{productionFooterName || '—'}</span>
                    </div>
                    <div className="cl-factory-signfoot-signature-row">
                      <div className="cl-factory-sign-cell">
                        <div className="cl-factory-sign-line" />
                        <p className="cl-factory-sign-label">Signature</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cl-factory-col-cut cl-factory-panel cl-factory-panel--accent cl-factory-panel--cut-list min-w-0">
                {printCutCategories.map(({ type, title }) => {
                  const slice = grouped[type];
                  if (!slice?.length) return null;
                  const block = (
                    <CuttingCategoryTable
                      title={title}
                      lines={slice}
                      startIndex={cutStartIndexByType[type]}
                    />
                  );
                  return <div key={type}>{block}</div>;
                })}
                {chunk.length === 0 ? (
                  <p className="cl-factory-cut-empty">No cutting lines with qty and length (roof, flat, or cladding).</p>
                ) : (
                  <p className="cl-factory-cut-empty font-bold text-right">
                    Grand total metres:{' '}
                    {chunk
                      .reduce((sum, line) => sum + line.sheets * line.lengthM, 0)
                      .toLocaleString('en-NG', { maximumFractionDigits: 2 })}{' '}
                    m
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="cl-a4-pane cl-a4-pane--waybill">
            <WaybillPanel
              {...waybillShared}
              continuation={false}
              chunkIndex={0}
              grouped={grouped}
              cutStartIndex={0}
              waybillCategories={waybillCutCategories}
            />
          </div>
        </div>
        <PrintAuditFooter
          printCount={printCount}
          lastPrintedAtISO={lastPrintedAtISO}
          lastPrintedBy={lastPrintedBy}
        />
      </section>
    </div>
  );
}
