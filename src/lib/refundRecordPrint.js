import { ZAREWA_COMPANY_ACCOUNT_NAME } from '../Data/companyQuotation.js';
import { formatPersonName } from './formatPersonName.js';
import { escapeHtml, openPrintHtmlDocument } from './officeDeskPrint.js';
import { parseUnproducedMetresLabel } from '../shared/lib/refundLineArithmetic.js';
import { refundCategoryDisplayLabel } from '../shared/refundConstants.js';
import { refundApprovedAmount, refundPublicStatusLabel } from './refundsStore.js';

/**
 * A5 landscape refund voucher — prints on the top half of A4 (cut A4 in two).
 * Detailed calculation math from previewSnapshot + payee account numbers.
 */

function parseJsonArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw == null || raw === '') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (raw == null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function resolvePreviewSnapshot(record) {
  return (
    parseJsonObject(record?.previewSnapshot) ||
    parseJsonObject(record?.preview_snapshot_json) ||
    parseJsonObject(record?.preview_snapshot) ||
    null
  );
}

function includedCalculationLines(record) {
  const raw = record?.calculationLines ?? record?.calculation_lines_json;
  const lines = parseJsonArray(raw);
  return lines.filter((l) => {
    if (l?.include === false) return false;
    const amt = Math.round(Number(l?.amountNgn ?? l?.amount_ngn ?? 0) || 0);
    const label = String(l?.label ?? '').trim();
    return amt > 0 && label;
  });
}

function reasonCategories(record) {
  const raw = record?.reasonCategory ?? record?.reason_category;
  return parseJsonArray(raw)
    .map((c) => refundCategoryDisplayLabel(String(c || '').trim()))
    .filter(Boolean);
}

function recipientKindLabel(kindRaw) {
  const k = String(kindRaw || '').trim().toLowerCase();
  if (k === 'associated_staff' || k === 'staff') return 'Staff';
  if (k === 'claiming_staff') return 'Claiming staff';
  if (k === 'customer') return 'Customer';
  return '';
}

function splitPayeeRows(record) {
  const fromList = (list) =>
    (Array.isArray(list) ? list : [])
      .map((row) => {
        const name = formatPersonName(
          String(row?.payeeName ?? row?.payee_name ?? row?.recipientName ?? '').trim()
        );
        const bank = String(
          row?.payeeBankName ??
            row?.payee_bank_name ??
            row?.payoutAccount?.bankName ??
            row?.payout_account?.bank_name ??
            ''
        ).trim();
        const acct = String(
          row?.payeeAccountNo ??
            row?.payee_account_no ??
            row?.payoutAccount?.accountNo ??
            row?.payout_account?.account_no ??
            ''
        ).trim();
        const kind = recipientKindLabel(row?.recipientKind ?? row?.recipient_kind);
        const gross = Math.round(Number(row?.amountNgn ?? row?.amount_ngn ?? 0) || 0);
        const net = Math.round(
          Number(row?.netPayoutNgn ?? row?.net_payout_ngn ?? row?.amountNgn ?? row?.amount_ngn ?? 0) || 0
        );
        const cut = Math.round(Number(row?.companyCutNgn ?? row?.company_cut_ngn ?? 0) || 0);
        return { name, bank, acct, kind, gross, net: net || gross, cut };
      })
      .filter((r) => r.net > 0 || r.gross > 0 || r.name || r.acct);

  if (Array.isArray(record?.splitDistributions) && record.splitDistributions.length) {
    return fromList(record.splitDistributions);
  }
  if (Array.isArray(record?.refundSplits) && record.refundSplits.length) {
    return fromList(record.refundSplits);
  }
  const fromJson = parseJsonArray(record?.split_distributions_json);
  if (fromJson.length) return fromList(fromJson);
  return [];
}

function defaultFormatNgn(n) {
  const v = Math.round(Number(n) || 0);
  return `₦${v.toLocaleString('en-NG')}`;
}

function formatMetres(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 100) / 100);
}

function formatPpm(n, formatNgn) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '';
  if (Math.abs(v - Math.round(v)) < 0.005) return `${formatNgn(Math.round(v))}/m`;
  return `₦${v.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/m`;
}

function kvRow(label, value) {
  if (value == null || value === '' || value === '—') return '';
  return `<div class="kv"><span class="k">${escapeHtml(label)}</span><span class="v">${escapeHtml(
    String(value)
  )}</span></div>`;
}

/**
 * Build structured calculation detail lines for one refund breakdown row.
 * @param {object} line
 * @param {object|null} snapshot
 * @param {(n: number) => string} formatNgn
 * @returns {string} HTML (inner)
 */
export function buildRefundLineCalculationDetailHtml(line, snapshot, formatNgn = defaultFormatNgn) {
  const cat = String(line?.category || '').trim();
  const label = String(line?.label || '').trim();
  const amt = Math.round(Number(line?.amountNgn ?? line?.amount_ngn ?? 0) || 0);
  const snap = snapshot && typeof snapshot === 'object' ? snapshot : null;
  const parts = [];

  if (cat === 'Overpayment' || /overpay/i.test(cat) || /overpay/i.test(label)) {
    const cash = Math.round(
      Number(snap?.quotationCashInNgn ?? snap?.paidOnQuoteNgn ?? snap?.receiptCashNgn ?? 0) || 0
    );
    const quoteTotal = Math.round(Number(snap?.quoteTotalNgn ?? 0) || 0);
    const excess = Math.round(
      Number(snap?.overpaymentExcessNgn ?? (cash > 0 && quoteTotal > 0 ? cash - quoteTotal : 0)) || 0
    );
    const residual = Math.round(Number(snap?.overpaymentResidualNgn ?? 0) || 0);
    if (cash > 0) parts.push(kvRow('Cash paid on quotation', formatNgn(cash)));
    if (quoteTotal > 0) parts.push(kvRow('Quotation total', formatNgn(quoteTotal)));
    if (cash > 0 && quoteTotal > 0) {
      parts.push(
        kvRow(
          'Balance (paid − quotation)',
          `${formatNgn(cash)} − ${formatNgn(quoteTotal)} = ${formatNgn(Math.max(0, cash - quoteTotal))}`
        )
      );
    } else if (excess > 0) {
      parts.push(kvRow('Overpayment balance', formatNgn(excess)));
    }
    if (residual > 0 && residual !== excess && residual !== amt) {
      parts.push(kvRow('Still refundable overpay', formatNgn(residual)));
    }
    parts.push(kvRow('This line', formatNgn(amt)));
  } else if (cat === 'Unproduced meterage' || /unproduced/i.test(label)) {
    const parsed = parseUnproducedMetresLabel(label);
    const quotedM = Number(snap?.quotedMeters);
    const producedM = Number(
      snap?.producedMetersForUnproduced ?? snap?.coilProducedMeters ?? snap?.actualMeters
    );
    const unproducedM =
      parsed?.metres ??
      (Number.isFinite(quotedM) && Number.isFinite(producedM) ? Math.max(0, quotedM - producedM) : NaN);
    const ppm =
      parsed?.pricePerMeterNgn ??
      Number(snap?.pricePerMeterNgn) ??
      (Number.isFinite(unproducedM) && unproducedM > 0 ? amt / unproducedM : NaN);

    if (Number.isFinite(quotedM) && quotedM > 0) parts.push(kvRow('Quoted metres', `${formatMetres(quotedM)} m`));
    if (Number.isFinite(producedM) && producedM >= 0) {
      parts.push(kvRow('Produced metres', `${formatMetres(producedM)} m`));
    }
    if (Number.isFinite(unproducedM) && unproducedM > 0) {
      parts.push(kvRow('Unproduced metres', `${formatMetres(unproducedM)} m`));
    }
    if (Number.isFinite(ppm) && ppm > 0) {
      parts.push(kvRow('Price charged / m', formatPpm(ppm, formatNgn)));
      if (Number.isFinite(unproducedM) && unproducedM > 0) {
        parts.push(
          kvRow(
            'Calculation',
            `${formatMetres(unproducedM)} m × ${formatPpm(ppm, formatNgn)} = ${formatNgn(amt)}`
          )
        );
      }
    } else {
      parts.push(`<div class="detail-fallback">${escapeHtml(label)}</div>`);
      parts.push(kvRow('This line', formatNgn(amt)));
    }
  } else if (cat === 'Substitution Difference' || /substitution/i.test(label)) {
    const rows = Array.isArray(snap?.substitutionPerMeterBreakdown)
      ? snap.substitutionPerMeterBreakdown
      : [];
    if (rows.length) {
      for (const row of rows.slice(0, 4)) {
        const metres = Number(row?.meters);
        const quotedPpm = Number(
          row?.quotedPricePerMeterNgn ?? row?.quotedListPricePerMeterNgn ?? row?.quotedSellingPpmNgn
        );
        const floorPpm = Number(
          row?.quotedFloorPricePerMeterNgn ??
            row?.producedListPricePerMeterNgn ??
            row?.coilFloorPpmNgn
        );
        const delta = Number(
          row?.deltaPerMeterNgn ??
            (Number.isFinite(quotedPpm) && Number.isFinite(floorPpm) ? quotedPpm - floorPpm : NaN)
        );
        const credit = Math.round(Number(row?.creditNgn ?? 0) || 0);
        const product = String(row?.productName || row?.jobId || 'Product').trim();
        const gaugeBits = [row?.quotedGaugeDesignLabel, row?.quotedGaugeForComparison, row?.coilGaugeFromAllocations]
          .map((x) => String(x || '').trim())
          .filter(Boolean);
        parts.push(`<div class="sub-head">${escapeHtml(product)}</div>`);
        if (gaugeBits.length) parts.push(kvRow('Gauge / design', gaugeBits.join(' → ')));
        if (Number.isFinite(quotedPpm) && quotedPpm > 0) {
          parts.push(kvRow('Paid / quoted ₦ per m', formatPpm(quotedPpm, formatNgn)));
        }
        if (Number.isFinite(floorPpm) && floorPpm > 0) {
          parts.push(kvRow('Floor price ₦ per m', formatPpm(floorPpm, formatNgn)));
        }
        if (Number.isFinite(delta)) {
          parts.push(kvRow('Difference per m', formatPpm(Math.abs(delta), formatNgn)));
        }
        if (Number.isFinite(metres) && metres > 0 && Number.isFinite(delta)) {
          parts.push(
            kvRow(
              'Calculation',
              `${formatMetres(metres)} m × ${formatPpm(Math.abs(delta), formatNgn)} = ${formatNgn(
                credit > 0 ? credit : Math.round(metres * Math.abs(delta))
              )}`
            )
          );
        } else if (credit > 0) {
          parts.push(kvRow('Credit', formatNgn(credit)));
        }
      }
      if (rows.length > 4) {
        parts.push(`<div class="tiny muted">+${rows.length - 4} more substitution row(s)</div>`);
      }
    } else {
      parts.push(`<div class="detail-fallback">${escapeHtml(label)}</div>`);
      parts.push(kvRow('This line', formatNgn(amt)));
    }
  } else if (cat === 'Order cancellation' || /order cancel/i.test(label)) {
    const cash = Math.round(Number(snap?.quotationCashInNgn ?? snap?.paidOnQuoteNgn ?? 0) || 0);
    const floor = snap?.economicFloor;
    const floorVal = Math.round(Number(floor?.floorDeliveredValueNgn ?? 0) || 0);
    const producedM = Number(floor?.producedOutputMeters ?? snap?.coilProducedMeters);
    if (cash > 0) parts.push(kvRow('Cash paid on quotation', formatNgn(cash)));
    if (Number.isFinite(producedM) && producedM > 0) {
      parts.push(kvRow('Produced (kept)', `${formatMetres(producedM)} m`));
    }
    if (floorVal > 0) parts.push(kvRow('Floor value of produced', formatNgn(floorVal)));
    parts.push(`<div class="detail-fallback">${escapeHtml(label)}</div>`);
    parts.push(kvRow('This line', formatNgn(amt)));
  } else if (/accessory|stone|shortfall/i.test(cat) || /shortfall/i.test(label)) {
    parts.push(`<div class="detail-fallback">${escapeHtml(label)}</div>`);
    const m = label.match(/\((\d+(?:\.\d+)?)\s*[×x]\s*₦([\d,]+(?:\.\d+)?)\)/i);
    if (m) {
      parts.push(
        kvRow(
          'Calculation',
          `${m[1]} × ${formatNgn(Number(String(m[2]).replace(/,/g, '')))} = ${formatNgn(amt)}`
        )
      );
    } else {
      parts.push(kvRow('This line', formatNgn(amt)));
    }
  } else {
    parts.push(`<div class="detail-fallback">${escapeHtml(label)}</div>`);
    parts.push(kvRow('This line', formatNgn(amt)));
  }

  return parts.filter(Boolean).join('');
}

/** Local wall-clock for print. */
export function formatRefundPrintDateTime(isoOrDate) {
  const raw = String(isoOrDate || '').trim();
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return raw.length >= 16 ? raw.slice(0, 16).replace('T', ' ') : raw;
  }
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}

function formatRefundPrintDate(isoOrDate) {
  const raw = String(isoOrDate || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      try {
        return new Intl.DateTimeFormat('en-GB', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
        }).format(d);
      } catch {
        return raw;
      }
    }
  }
  return formatRefundPrintDateTime(raw);
}

function densityClass(lineCount, hasSubs) {
  const weight = lineCount + (hasSubs ? 2 : 0);
  if (weight >= 6) return 'density-packed';
  if (weight >= 3) return 'density-tight';
  return 'density-normal';
}

/**
 * Build printable HTML for a refund voucher (A5 landscape on A4 top half).
 * @param {object} record
 * @param {(n: number) => string} [formatNgn]
 * @returns {string}
 */
export function buildRefundRecordPrintHtml(record, formatNgn = defaultFormatNgn) {
  if (!record) return '';

  const refundID = String(record.refundID || record.refund_id || '—');
  const statusLabel = refundPublicStatusLabel(record) || String(record.status || '—');
  const customerName = formatPersonName(
    record.customerName || record.customer || record.customer_name || '—'
  );
  const quotationRef = String(record.quotationRef || record.quotation_ref || '—').trim() || '—';
  const requestedAt = formatRefundPrintDateTime(
    record.requestedAtISO || record.requested_at_iso || ''
  );
  const requestedBy = formatPersonName(String(record.requestedBy || record.requested_by || '').trim());
  const reasonText = String(record.reasonNotes || record.reason || '').trim();
  const calcNotes = String(record.calculationNotes || record.calculation_notes || '').trim();
  const amountReq = Math.round(Number(record.amountNgn ?? record.amount_ngn ?? 0) || 0);
  const approvedAmt = refundApprovedAmount(record);
  const approvalDate = formatRefundPrintDate(record.approvalDate || record.approval_date || '');
  const approvedBy = formatPersonName(String(record.approvedBy || record.approved_by || '').trim());
  const managerComments = String(record.managerComments || record.manager_comments || '').trim();
  const paidAt = formatRefundPrintDateTime(record.paidAtISO || record.paid_at_iso || '');
  const paidAmt = Math.round(Number(record.paidAmountNgn ?? record.paid_amount_ngn ?? 0) || 0);
  const paidBy = formatPersonName(String(record.paidBy || record.paid_by || '').trim());
  const creditApplied = Math.round(
    Number(record.creditAppliedNgn ?? record.credit_applied_ngn ?? 0) || 0
  );
  const creditTo = String(
    record.creditAppliedToQuotationRef || record.credit_applied_to_quotation_ref || ''
  ).trim();

  const headerPayeeName = formatPersonName(String(record.payeeName || record.payee_name || '').trim());
  const headerPayeeAccountNo = String(record.payeeAccountNo || record.payee_account_no || '').trim();
  const headerPayeeBankName = String(record.payeeBankName || record.payee_bank_name || '').trim();

  const snapshot = resolvePreviewSnapshot(record);
  const cats = reasonCategories(record);
  const lines = includedCalculationLines(record);
  const splits = splitPayeeRows(record);
  const hasSubs = lines.some((l) => String(l.category || '').includes('Substitution'));

  const amountToPay = Math.max(0, (approvedAmt > 0 ? approvedAmt : amountReq) - creditApplied);
  const companyLegal = ZAREWA_COMPANY_ACCOUNT_NAME;
  const dens = densityClass(lines.length, hasSubs);

  const rowsHtml = lines.length
    ? lines
        .map((l) => {
          const cat = refundCategoryDisplayLabel(String(l.category || '').trim()) || '—';
          const amt = Math.round(Number(l.amountNgn ?? l.amount_ngn ?? 0) || 0);
          const detail = buildRefundLineCalculationDetailHtml(l, snapshot, formatNgn);
          return `<tr>
            <td class="cat">${escapeHtml(cat)}</td>
            <td class="how">${detail}</td>
            <td class="right amt-cell">${escapeHtml(formatNgn(amt))}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="3" class="muted">No calculation lines stored.</td></tr>`;

  const lineSum = lines.reduce(
    (s, l) => s + Math.round(Number(l.amountNgn ?? l.amount_ngn ?? 0) || 0),
    0
  );
  const showLineSum = lines.length > 0 && Math.abs(lineSum - amountReq) > 1;

  let payeeBlock = '';
  if (splits.length > 0) {
    const splitRows = splits
      .map((s) => {
        const who = [s.kind, s.name].filter(Boolean).join(' · ') || '—';
        const cutNote =
          s.cut > 0
            ? `<div class="tiny muted">Gross ${escapeHtml(formatNgn(s.gross))} · company cut ${escapeHtml(
                formatNgn(s.cut)
              )}</div>`
            : '';
        return `<tr>
          <td>
            <div class="pay-name">${escapeHtml(who)}</div>
            ${s.bank ? `<div class="tiny">${escapeHtml(s.bank)}</div>` : ''}
            <div class="acct-num">${
              s.acct
                ? `Account: <strong>${escapeHtml(s.acct)}</strong>`
                : '<span class="muted">Account: not on file</span>'
            }</div>
            ${cutNote}
          </td>
          <td class="right">${escapeHtml(formatNgn(s.net))}</td>
        </tr>`;
      })
      .join('');
    payeeBlock = `
      <h2>Pay to (requested / paid)</h2>
      <table class="payees">
        <thead><tr><th>Recipient &amp; account</th><th class="right">Net</th></tr></thead>
        <tbody>${splitRows}</tbody>
      </table>`;
  } else {
    payeeBlock = `
      <h2>Pay to (requested / paid)</h2>
      <div class="pay-single">
        <div class="pay-name">${escapeHtml(headerPayeeName || 'Payee to be confirmed')}</div>
        ${headerPayeeBankName ? `<div>${escapeHtml(headerPayeeBankName)}</div>` : ''}
        <div class="acct-num">${
          headerPayeeAccountNo
            ? `Account number: <strong>${escapeHtml(headerPayeeAccountNo)}</strong>`
            : '<span class="muted">Account number: not on file</span>'
        }</div>
      </div>`;
  }

  const catsJoined = cats.join(' · ');
  const notesDuplicateCats =
    reasonText &&
    cats.length > 0 &&
    reasonText.replace(/\s+/g, ' ').toLowerCase() ===
      cats
        .map((c) => c.toLowerCase())
        .join(', ')
        .replace(/\s+/g, ' ');

  const payeeSigName =
    splits.length === 1
      ? splits[0].name
      : splits.length > 1
        ? 'Multiple — see Pay to'
        : headerPayeeName || '';

  const printedAt = formatRefundPrintDateTime(new Date().toISOString());

  const totalsHtml = `
      <div class="totals">
        ${
          showLineSum
            ? `<div>Lines total</div><div class="amt">${escapeHtml(formatNgn(lineSum))}</div>`
            : ''
        }
        <div>Amount requested</div><div class="amt">${escapeHtml(formatNgn(amountReq))}</div>
        ${
          approvedAmt > 0 || approvalDate || approvedBy
            ? `<div>Approved${approvalDate ? ` (${escapeHtml(approvalDate)})` : ''}${
                approvedBy ? ` · ${escapeHtml(approvedBy)}` : ''
              }</div><div class="amt">${escapeHtml(formatNgn(approvedAmt))}</div>`
            : ''
        }
        ${
          creditApplied > 0
            ? `<div>Applied as credit${creditTo ? ` → ${escapeHtml(creditTo)}` : ''}</div><div class="amt">${escapeHtml(
                formatNgn(creditApplied)
              )}</div>`
            : ''
        }
        ${
          paidAt
            ? `<div>Paid${paidBy ? ` · ${escapeHtml(paidBy)}` : ''}${
                paidAt ? ` · ${escapeHtml(paidAt)}` : ''
              }</div><div class="amt">${escapeHtml(formatNgn(paidAmt))}</div>`
            : ''
        }
        <div class="pay-row">Cash / till to pay</div><div class="amt pay-row">${escapeHtml(
          formatNgn(amountToPay)
        )}</div>
      </div>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<title>Refund ${escapeHtml(refundID)}</title>
<style>
  /* A4 tray: voucher is A5 landscape (top half). Cut on the dashed line. */
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: #0f172a;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 7pt;
    line-height: 1.15;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .a4-host {
    width: 210mm;
    height: 297mm;
    margin: 0 auto;
    overflow: hidden;
    page-break-after: avoid;
  }
  .sheet {
    width: 210mm;
    height: 148.5mm;
    max-height: 148.5mm;
    padding: 3.5mm 5mm 2.5mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
    transform-origin: top left;
  }
  .sheet.density-tight { font-size: 6.5pt; }
  .sheet.density-packed { font-size: 6pt; }
  .sheet.density-tight .sig,
  .sheet.density-packed .sig { min-height: 12mm; padding: 1mm; }
  .sheet.density-packed h1 { font-size: 9pt; }
  .sheet.density-packed .badge-amt { font-size: 9pt; }
  .cut-guide {
    height: 0;
    border-top: 1px dashed #94a3b8;
    position: relative;
    margin: 0 8mm;
  }
  .cut-guide::after {
    content: "✂ Cut here — half A4 = A5 landscape";
    position: absolute;
    top: -2.2mm;
    right: 0;
    font-size: 5.5pt;
    color: #64748b;
    background: #fff;
    padding: 0 1.5mm;
  }
  .a4-spare {
    height: 148.5mm;
  }
  header {
    border-bottom: 1.5px solid #1a3a5a;
    padding-bottom: 1.2mm;
    margin-bottom: 1.2mm;
    flex-shrink: 0;
  }
  .brand-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 3mm;
  }
  .brand {
    font-size: 6pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #1a3a5a;
  }
  .legal {
    margin-top: 0.2mm;
    font-size: 5pt;
    color: #64748b;
  }
  .badge {
    flex-shrink: 0;
    text-align: right;
    border: 1px solid #1a3a5a;
    border-radius: 0.8mm;
    padding: 1mm 2mm;
  }
  .badge .badge-label {
    font-size: 5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
  }
  .badge .badge-amt {
    margin-top: 0.2mm;
    font-size: 11pt;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: #1a3a5a;
  }
  h1 {
    margin: 0.4mm 0 0;
    font-size: 10pt;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  .meta {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.4mm 2.5mm;
    margin-top: 1mm;
    font-size: 6.5pt;
  }
  .meta strong { font-weight: 700; }
  .meta .label {
    color: #64748b;
    font-weight: 600;
    font-size: 5pt;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  h2 {
    margin: 0 0 0.6mm;
    font-size: 6pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #1a3a5a;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 0.3mm;
  }
  .main-cols {
    display: grid;
    grid-template-columns: 1.55fr 1fr;
    gap: 3mm;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }
  .col-calc, .col-side {
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: inherit;
  }
  th, td {
    border: 1px solid #94a3b8;
    padding: 0.6mm 1mm;
    vertical-align: top;
    text-align: left;
  }
  th {
    background: #e2e8f0;
    font-weight: 700;
    font-size: 5pt;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .right { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .amt-cell { font-weight: 800; width: 16%; }
  .cat { width: 18%; font-weight: 700; }
  .how { width: 66%; word-break: break-word; }
  .kv {
    display: grid;
    grid-template-columns: 40% 1fr;
    gap: 0.2mm 1.2mm;
    margin: 0.15mm 0;
  }
  .kv .k { color: #64748b; font-weight: 600; }
  .kv .v { font-variant-numeric: tabular-nums; font-weight: 600; }
  .sub-head { font-weight: 800; margin-top: 0.4mm; color: #1a3a5a; }
  .detail-fallback { margin-bottom: 0.3mm; }
  .muted { color: #64748b; }
  .tiny { font-size: 5pt; margin-top: 0.15mm; line-height: 1.12; }
  .block { margin: 0.5mm 0; font-size: inherit; }
  .totals {
    margin: 1mm 0;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.25mm 2.5mm;
    font-size: inherit;
  }
  .totals .amt { font-variant-numeric: tabular-nums; font-weight: 700; text-align: right; }
  .totals .pay-row {
    font-size: 1.12em;
    font-weight: 800;
    border-top: 1.5px solid #1a3a5a;
    padding-top: 0.5mm;
    margin-top: 0.3mm;
  }
  .pay-single { font-size: inherit; line-height: 1.22; }
  .pay-name { font-weight: 800; font-size: 1.05em; }
  .acct-num {
    margin-top: 0.4mm;
    font-size: 1.05em;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }
  .acct-num strong { font-size: 1.12em; font-weight: 800; }
  .sigs {
    margin-top: 1.2mm;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 2mm;
    flex-shrink: 0;
  }
  .sig {
    border: 1px solid #64748b;
    border-radius: 0.8mm;
    padding: 1mm;
    min-height: 14mm;
    display: flex;
    flex-direction: column;
  }
  .sig-title {
    font-size: 5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #1a3a5a;
  }
  .sig-name {
    margin-top: 0.3mm;
    font-size: 6pt;
    font-weight: 600;
    min-height: 7pt;
    word-break: break-word;
  }
  .sig-line {
    margin-top: auto;
    border-top: 1px solid #334155;
    padding-top: 0.4mm;
    font-size: 5pt;
    color: #475569;
  }
  .foot {
    margin-top: 0.8mm;
    font-size: 4.5pt;
    color: #64748b;
    text-align: center;
    flex-shrink: 0;
  }
  @media print {
    html, body {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
    }
    .a4-host { overflow: hidden; }
    .sheet { overflow: hidden; }
  }
  @media screen {
    body { background: #e2e8f0; padding: 8mm; }
    .a4-host {
      background: #fff;
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.12);
      height: auto;
      min-height: 297mm;
    }
    .sheet { background: #fff; }
    .a4-spare {
      background: repeating-linear-gradient(
        -45deg,
        #f8fafc,
        #f8fafc 6px,
        #f1f5f9 6px,
        #f1f5f9 12px
      );
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 8pt;
    }
    .a4-spare::before { content: "Blank half (discard or second slip)"; }
  }
</style></head><body>
  <div class="a4-host">
    <div class="sheet ${dens}" id="refund-a5-sheet">
      <header>
        <div class="brand-row">
          <div>
            <div class="brand">Customer refund voucher · A5 landscape</div>
            <div class="legal">${escapeHtml(companyLegal)}</div>
            <h1>Refund details</h1>
          </div>
          <div class="badge">
            <div class="badge-label">Amount to pay</div>
            <div class="badge-amt">${escapeHtml(formatNgn(amountToPay))}</div>
          </div>
        </div>
        <div class="meta">
          <div><span class="label">Refund ID</span><br/><strong>${escapeHtml(refundID)}</strong></div>
          <div><span class="label">Status</span><br/><strong>${escapeHtml(statusLabel)}</strong></div>
          <div><span class="label">Customer</span><br/><strong>${escapeHtml(customerName)}</strong></div>
          <div><span class="label">Quotation</span><br/><strong>${escapeHtml(quotationRef)}</strong></div>
          <div><span class="label">Requested</span><br/><strong>${escapeHtml(requestedAt || '—')}</strong>${
            requestedBy ? `<br/><span class="tiny">${escapeHtml(requestedBy)}</span>` : ''
          }</div>
          <div><span class="label">Printed</span><br/><strong>${escapeHtml(printedAt)}</strong></div>
        </div>
      </header>

      <div class="main-cols">
        <div class="col-calc">
          ${
            cats.length
              ? `<div class="block"><strong>Refund types</strong> — ${escapeHtml(catsJoined)}</div>`
              : ''
          }
          ${
            reasonText && !notesDuplicateCats
              ? `<div class="block"><strong>Notes</strong> — ${escapeHtml(reasonText)}</div>`
              : ''
          }
          <h2>How it was calculated</h2>
          <table>
            <thead>
              <tr><th>Type</th><th>Calculation detail</th><th class="right">Amount</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          ${
            calcNotes
              ? `<div class="block muted"><strong>Notes</strong> — ${escapeHtml(calcNotes)}</div>`
              : ''
          }
          ${
            managerComments
              ? `<div class="block"><strong>Approver note</strong> — ${escapeHtml(managerComments)}</div>`
              : ''
          }
        </div>
        <div class="col-side">
          <h2>Amounts</h2>
          ${totalsHtml}
          ${payeeBlock}
        </div>
      </div>

      <div class="sigs">
        <div class="sig">
          <div class="sig-title">Applicant</div>
          <div class="sig-name">${escapeHtml(requestedBy || ' ')}</div>
          <div class="sig-line">Signature / date</div>
        </div>
        <div class="sig">
          <div class="sig-title">Approver</div>
          <div class="sig-name">${escapeHtml(approvedBy || ' ')}</div>
          <div class="sig-line">Signature / date</div>
        </div>
        <div class="sig">
          <div class="sig-title">Payee (received)</div>
          <div class="sig-name">${escapeHtml(payeeSigName || ' ')}</div>
          <div class="sig-line">Signature / date</div>
        </div>
      </div>
      <div class="foot">A5 landscape on A4 · Cut on dashed line · File behind cutting list</div>
    </div>
    <div class="cut-guide" aria-hidden="true"></div>
    <div class="a4-spare" aria-hidden="true"></div>
  </div>
  <script>
    (function () {
      function fitSheet() {
        var sheet = document.getElementById('refund-a5-sheet');
        if (!sheet) return;
        sheet.style.transform = '';
        var maxH = sheet.clientHeight || 0;
        var need = sheet.scrollHeight || 0;
        if (!maxH || need <= maxH + 1) return;
        var scale = Math.max(0.7, Math.min(1, maxH / need));
        sheet.style.transform = 'scale(' + scale.toFixed(4) + ')';
      }
      fitSheet();
      window.addEventListener('beforeprint', fitSheet);
      setTimeout(fitSheet, 50);
    })();
  </script>
</body></html>`;
}

/**
 * Print-friendly refund voucher (A5 landscape on A4, single half-page).
 * @param {object} record
 * @param {(n: number) => string} [formatNgn]
 * @returns {boolean}
 */
export function printRefundRecord(record, formatNgn) {
  if (!record) return false;
  try {
    const html = buildRefundRecordPrintHtml(record, formatNgn || defaultFormatNgn);
    if (!html) return false;
    const refundID = String(record.refundID || record.refund_id || 'Refund');
    return openPrintHtmlDocument(html, `Refund ${refundID}`, { page: 'A4' });
  } catch {
    return false;
  }
}
