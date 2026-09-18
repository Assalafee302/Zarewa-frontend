import { ZAREWA_COMPANY_ACCOUNT_NAME } from '../Data/companyQuotation.js';
import { formatPersonName } from './formatPersonName.js';
import { escapeHtml, openPrintHtmlDocument } from './officeDeskPrint.js';
import { refundCategoryDisplayLabel } from '../shared/refundConstants.js';
import { refundApprovedAmount, refundPublicStatusLabel } from './refundsStore.js';

/**
 * A5 portrait refund voucher — fits the back of a cutting-list sheet.
 * Shows included calculation lines (type + how calculated), amounts, payee(s),
 * and signature lines for applicant, approver, and payee.
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
      .filter((r) => r.net > 0 || r.gross > 0 || r.name);

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

/** Local wall-clock for print (avoids UTC-only ISO slices looking “wrong” on the desk). */
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

/**
 * Build printable HTML for a refund voucher (A5). Exported for unit tests.
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

  const cats = reasonCategories(record);
  const lines = includedCalculationLines(record);
  const splits = splitPayeeRows(record);

  const amountToPay = Math.max(0, (approvedAmt > 0 ? approvedAmt : amountReq) - creditApplied);
  const companyLegal = ZAREWA_COMPANY_ACCOUNT_NAME;

  const rowsHtml = lines.length
    ? lines
        .map((l) => {
          const label = String(l.label || '—');
          const cat = refundCategoryDisplayLabel(String(l.category || '').trim()) || '—';
          const amt = Math.round(Number(l.amountNgn ?? l.amount_ngn ?? 0) || 0);
          return `<tr>
            <td class="cat">${escapeHtml(cat)}</td>
            <td class="how">${escapeHtml(label)}</td>
            <td class="right">${escapeHtml(formatNgn(amt))}</td>
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
        const bankLine = [s.bank, s.acct ? `Acct ${s.acct}` : ''].filter(Boolean).join(' · ');
        const cutNote =
          s.cut > 0
            ? `<div class="tiny muted">Gross ${escapeHtml(formatNgn(s.gross))} · company cut ${escapeHtml(
                formatNgn(s.cut)
              )}</div>`
            : '';
        return `<tr>
          <td>${escapeHtml(who)}${
            bankLine ? `<div class="tiny muted">${escapeHtml(bankLine)}</div>` : ''
          }${cutNote}</td>
          <td class="right">${escapeHtml(formatNgn(s.net))}</td>
        </tr>`;
      })
      .join('');
    payeeBlock = `
      <h2>Pay to</h2>
      <table class="payees">
        <thead><tr><th>Recipient</th><th class="right">Net payout</th></tr></thead>
        <tbody>${splitRows}</tbody>
      </table>
      ${
        splits.length > 1
          ? `<p class="tiny muted">Each recipient signs when they receive their net payout.</p>`
          : ''
      }`;
  } else if (headerPayeeName || headerPayeeAccountNo || headerPayeeBankName) {
    payeeBlock = `
      <h2>Pay to</h2>
      <div class="pay-single">
        <div class="pay-name">${escapeHtml(headerPayeeName || '—')}</div>
        ${headerPayeeBankName ? `<div>${escapeHtml(headerPayeeBankName)}</div>` : ''}
        ${headerPayeeAccountNo ? `<div>Acct: ${escapeHtml(headerPayeeAccountNo)}</div>` : ''}
      </div>`;
  } else {
    payeeBlock = `
      <h2>Pay to</h2>
      <div class="pay-single muted">Payee to be confirmed at payout.</div>`;
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

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<title>Refund ${escapeHtml(refundID)}</title>
<style>
  @page {
    size: A5 portrait;
    margin: 5.5mm 6.5mm;
  }
  @page refund-a5 {
    size: A5 portrait;
    margin: 5.5mm 6.5mm;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: #0f172a;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 8.5pt;
    line-height: 1.22;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    page: refund-a5;
    width: 148mm;
    min-height: 198mm;
    max-width: 148mm;
    margin: 0 auto;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  header {
    border-bottom: 2px solid #1a3a5a;
    padding-bottom: 2.5mm;
    margin-bottom: 2.5mm;
  }
  .brand-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 3mm;
  }
  .brand {
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #1a3a5a;
  }
  .legal {
    margin-top: 0.4mm;
    font-size: 6.5pt;
    color: #64748b;
    max-width: 95mm;
  }
  .badge {
    flex-shrink: 0;
    text-align: right;
    border: 1px solid #1a3a5a;
    border-radius: 1mm;
    padding: 1.2mm 2mm;
    min-width: 28mm;
  }
  .badge .badge-label {
    font-size: 6pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
  }
  .badge .badge-amt {
    margin-top: 0.4mm;
    font-size: 11pt;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: #1a3a5a;
  }
  h1 {
    margin: 1.2mm 0 0;
    font-size: 12pt;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  .meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8mm 4mm;
    margin-top: 2mm;
    font-size: 7.5pt;
  }
  .meta strong { font-weight: 700; }
  .meta .label { color: #64748b; font-weight: 600; font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.03em; }
  h2 {
    margin: 2.5mm 0 1.2mm;
    font-size: 7.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #1a3a5a;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 0.6mm;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt;
  }
  th, td {
    border: 1px solid #94a3b8;
    padding: 1.1mm 1.5mm;
    vertical-align: top;
    text-align: left;
  }
  th {
    background: #e2e8f0;
    font-weight: 700;
    font-size: 6.5pt;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .right { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .cat { width: 26%; font-weight: 600; }
  .how { width: 54%; word-break: break-word; }
  .muted { color: #64748b; }
  .tiny { font-size: 6.5pt; margin-top: 0.4mm; line-height: 1.2; }
  .block { margin: 1.2mm 0; font-size: 7.5pt; }
  .totals {
    margin-top: 1.8mm;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.6mm 4mm;
    font-size: 8pt;
  }
  .totals .amt { font-variant-numeric: tabular-nums; font-weight: 700; text-align: right; }
  .totals .pay-row {
    font-size: 9.5pt;
    font-weight: 800;
    border-top: 1.5px solid #1a3a5a;
    padding-top: 1mm;
    margin-top: 0.6mm;
  }
  .pay-single { font-size: 8pt; line-height: 1.3; }
  .pay-name { font-weight: 800; font-size: 9.5pt; }
  .body { flex: 1 1 auto; }
  .sigs {
    margin-top: auto;
    padding-top: 3.5mm;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 2.5mm;
    page-break-inside: avoid;
  }
  .sig {
    border: 1px solid #64748b;
    border-radius: 1mm;
    padding: 1.8mm;
    min-height: 26mm;
    display: flex;
    flex-direction: column;
  }
  .sig-title {
    font-size: 6.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #1a3a5a;
  }
  .sig-name {
    margin-top: 0.8mm;
    font-size: 7pt;
    font-weight: 600;
    min-height: 9pt;
    word-break: break-word;
  }
  .sig-line {
    margin-top: auto;
    border-top: 1px solid #334155;
    padding-top: 0.8mm;
    font-size: 6.5pt;
    color: #475569;
  }
  .foot {
    margin-top: 2mm;
    font-size: 6pt;
    color: #64748b;
    text-align: center;
  }
  @media print {
    html, body { width: 148mm; }
    .sheet { width: 148mm; min-height: auto; }
  }
  @media screen {
    body { background: #e2e8f0; padding: 8mm; }
    .sheet {
      background: #fff;
      padding: 5.5mm 6.5mm;
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.12);
    }
  }
</style></head><body>
  <div class="sheet">
    <header>
      <div class="brand-row">
        <div>
          <div class="brand">Customer refund voucher</div>
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

    <div class="body">
      ${
        cats.length
          ? `<div class="block"><strong>Refund types</strong><br/>${escapeHtml(catsJoined)}</div>`
          : ''
      }
      ${
        reasonText && !notesDuplicateCats
          ? `<div class="block"><strong>Notes</strong><br/>${escapeHtml(reasonText)}</div>`
          : ''
      }

      <h2>How it was calculated</h2>
      <table>
        <thead>
          <tr><th>Type</th><th>Calculation</th><th class="right">Amount</th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${
        calcNotes
          ? `<div class="block muted"><strong>Calculation notes</strong><br/>${escapeHtml(calcNotes)}</div>`
          : ''
      }

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
      </div>
      ${
        managerComments
          ? `<div class="block"><strong>Approver note</strong><br/>${escapeHtml(managerComments)}</div>`
          : ''
      }

      ${payeeBlock}
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
    <div class="foot">A5 · Print on back of cutting list · Keep with job file</div>
  </div>
</body></html>`;
}

/**
 * Print-friendly refund voucher (A5 filing copy).
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
    return openPrintHtmlDocument(html, `Refund ${refundID}`, { page: 'A5' });
  } catch {
    return false;
  }
}
