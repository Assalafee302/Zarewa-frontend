import { escapeHtml, openPrintHtmlDocument } from './officeDeskPrint.js';
import { formatNgn } from '../Data/mockData.js';
import { numberToWordsNgn } from './treasuryLodgementPrint.js';

/**
 * Generates and prints an official Cashier Payout / Disbursement Voucher.
 * @param {object} params
 */
export function printPayoutVoucher({
  voucherId,
  dateISO,
  kind,
  payeeName,
  payeeAccountNo,
  payeeBankName,
  amountNgn,
  description,
  expenseCategory,
  accountName,
  approvedBy,
  postedBy,
  branchLabel,
}) {
  const id = escapeHtml(String(voucherId || 'PAY-DRAFT'));
  const date = escapeHtml(String(dateISO || new Date().toISOString()).slice(0, 10));
  const payee = escapeHtml(String(payeeName || 'Cash Payee'));
  const bank = escapeHtml(String(payeeBankName || ''));
  const accNo = escapeHtml(String(payeeAccountNo || ''));
  const cat = escapeHtml(String(expenseCategory || kind || 'General Disbursement'));
  const desc = escapeHtml(String(description || ''));
  const acc = escapeHtml(String(accountName || 'Cash Safe / Bank'));
  const approver = escapeHtml(String(approvedBy || 'Branch Manager / MD'));
  const cashier = escapeHtml(String(postedBy || 'Cashier'));
  const branch = escapeHtml(String(branchLabel || 'Zarewa Branch'));
  const amount = Number(amountNgn) || 0;
  const words = escapeHtml(numberToWordsNgn(amount));

  const bankLine = [bank, accNo].filter(Boolean).join(' · ');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Payout Voucher - ${id}</title>
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
      margin-bottom: 12px;
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
      gap: 10px;
      margin-bottom: 12px;
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
      background: #fdf2f8;
      border: 1.5px solid #fbcfe8;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-num {
      font-size: 18px;
      font-weight: 900;
      color: #9d174d;
      font-family: monospace;
    }
    .amount-words {
      font-size: 11px;
      font-style: italic;
      color: #be185d;
      margin-top: 2px;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-box {
      text-align: center;
    }
    .sig-line {
      border-bottom: 1px solid #475569;
      height: 26px;
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
      <div class="voucher-title">Disbursement &amp; Payout Voucher</div>
    </div>
    <div class="meta-box">
      <div>Voucher No: <strong>${id}</strong></div>
      <div>Date: ${date}</div>
      <div>Branch: ${branch}</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="label">Paid To (Payee)</div>
      <div class="val">${payee} ${bankLine ? `<span style="font-size: 10px; color: #475569;">(${bankLine})</span>` : ''}</div>
    </div>
    <div>
      <div class="label">Paid From (Treasury Account)</div>
      <div class="val">${acc}</div>
    </div>
    <div>
      <div class="label">Expense Category / Type</div>
      <div class="val">${cat}</div>
    </div>
    <div>
      <div class="label">Authorization / Approved By</div>
      <div class="val">${approver}</div>
    </div>
    ${desc ? `
    <div style="grid-column: span 2;">
      <div class="label">Description / Purpose</div>
      <div class="val" style="font-weight: 500;">${desc}</div>
    </div>` : ''}
  </div>

  <div class="amount-banner">
    <div>
      <div class="label" style="color: #9d174d;">Amount Disbursed</div>
      <div class="amount-words">${words}</div>
    </div>
    <div class="amount-num">${formatNgn(amount)}</div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-role">Prepared By (${cashier})</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-role">Authorized By (${approver})</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-role">Received By (${payee})</div>
    </div>
  </div>
</body>
</html>`;

  return openPrintHtmlDocument(html, `Payout-${id}`, { page: 'A5' });
}
