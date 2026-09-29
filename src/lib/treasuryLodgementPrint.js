import { escapeHtml, openPrintHtmlDocument } from './officeDeskPrint.js';
import { formatNgn } from '../Data/mockData.js';

/**
 * Converts a number to words in Nigerian Naira (simple formatter for vouchers).
 */
export function numberToWordsNgn(amount) {
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) return 'Zero Naira Only';
  if (n > 1_000_000_000) return `${formatNgn(n)} Naira Only`;

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(num) {
    let str = '';
    if (num >= 100) {
      str += `${ones[Math.floor(num / 100)]} Hundred `;
      num %= 100;
      if (num > 0) str += 'and ';
    }
    if (num >= 20) {
      str += `${tens[Math.floor(num / 10)]} `;
      num %= 10;
    }
    if (num > 0) {
      str += `${ones[num]} `;
    }
    return str.trim();
  }

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const remainder = n % 1000;

  const parts = [];
  if (millions > 0) parts.push(`${convertChunk(millions)} Million`);
  if (thousands > 0) parts.push(`${convertChunk(thousands)} Thousand`);
  if (remainder > 0) parts.push(convertChunk(remainder));

  return `${parts.join(' ')} Naira Only`;
}

/**
 * Generates and prints an official Treasury Lodgement / Fund Movement Voucher.
 * @param {object} params
 */
export function printTreasuryLodgementVoucher({
  transferId,
  dateISO,
  fromAccountName,
  toAccountName,
  amountNgn,
  reference,
  branchLabel,
  postedBy,
}) {
  const id = escapeHtml(String(transferId || 'TRF-DRAFT'));
  const date = escapeHtml(String(dateISO || new Date().toISOString()).slice(0, 10));
  const from = escapeHtml(String(fromAccountName || 'Source Account'));
  const to = escapeHtml(String(toAccountName || 'Destination Account'));
  const ref = escapeHtml(String(reference || 'Internal Transfer'));
  const branch = escapeHtml(String(branchLabel || 'Zarewa Branch'));
  const actor = escapeHtml(String(postedBy || 'Cashier Desk'));
  const amount = Number(amountNgn) || 0;
  const words = escapeHtml(numberToWordsNgn(amount));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Treasury Lodgement Voucher - ${id}</title>
  <style>
    @media print {
      body { padding: 12px; font-size: 11px; }
      @page { size: A5 landscape; margin: 8mm; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      padding: 24px;
      max-width: 680px;
      margin: 0 auto;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #134e4a;
      padding-bottom: 8px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company {
      font-size: 15px;
      font-weight: 800;
      color: #134e4a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .voucher-title {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
    }
    .meta-box strong { color: #134e4a; font-family: monospace; font-size: 12px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .val {
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 1px;
    }
    .amount-banner {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-num {
      font-size: 18px;
      font-weight: 900;
      color: #166534;
      font-family: monospace;
    }
    .amount-words {
      font-size: 11px;
      font-style: italic;
      color: #15803d;
      margin-top: 2px;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 26px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-box {
      text-align: center;
    }
    .sig-line {
      border-bottom: 1px solid #475569;
      height: 28px;
      margin-bottom: 4px;
    }
    .sig-role {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">Zarewa Aluminium &amp; Plastics Ltd</div>
      <div class="voucher-title">Treasury Lodgement / Transfer Voucher</div>
    </div>
    <div class="meta-box">
      <div>Ref: <strong>${id}</strong></div>
      <div>Date: ${date}</div>
      <div>Branch: ${branch}</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="label">Disbursed From (Source)</div>
      <div class="val">${from}</div>
    </div>
    <div>
      <div class="label">Lodged Into (Destination)</div>
      <div class="val">${to}</div>
    </div>
    <div style="grid-column: span 2;">
      <div class="label">Lodgement Reference / Slip No.</div>
      <div class="val">${ref}</div>
    </div>
  </div>

  <div class="amount-banner">
    <div>
      <div class="label" style="color: #166534;">Amount Transferred</div>
      <div class="amount-words">${words}</div>
    </div>
    <div class="amount-num">${formatNgn(amount)}</div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-role">Dispatched By (${actor})</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-role">Lodged By (Courier / Custodian)</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-role">Authorized / Verified (Manager)</div>
    </div>
  </div>
</body>
</html>`;

  return openPrintHtmlDocument(html, `Lodgement-${id}`, { page: 'A5' });
}
