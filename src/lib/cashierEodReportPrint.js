import { escapeHtml, openPrintHtmlDocument } from './officeDeskPrint.js';
import { formatNgn } from '../Data/mockData.js';

/**
 * Generates and prints the official Cashier End-of-Day (EOD) Till Balancing Report (SOP-02 §3.3 & §12).
 * @param {object} params
 */
export function printCashierEodReport({
  dateISO,
  cashierName,
  branchLabel,
  denominations = {},
  physicalCashNgn = 0,
  bookCashNgn = 0,
  varianceNgn = 0,
  posBalanceNgn = 0,
  confirmedReceiptsCount = 0,
  confirmedReceiptsNgn = 0,
  pendingReceiptsCount = 0,
  pendingReceiptsNgn = 0,
  payoutsCount = 0,
  payoutsNgn = 0,
  notes = '',
}) {
  const date = escapeHtml(String(dateISO || new Date().toISOString()).slice(0, 10));
  const cashier = escapeHtml(String(cashierName || 'Cashier'));
  const branch = escapeHtml(String(branchLabel || 'Zarewa Branch'));
  const safeNotes = escapeHtml(String(notes || 'None'));

  const denomRows = [
    { label: '₦1,000 Notes', count: Number(denominations['1000']) || 0, value: (Number(denominations['1000']) || 0) * 1000 },
    { label: '₦500 Notes', count: Number(denominations['500']) || 0, value: (Number(denominations['500']) || 0) * 500 },
    { label: '₦200 Notes', count: Number(denominations['200']) || 0, value: (Number(denominations['200']) || 0) * 200 },
    { label: '₦100 Notes', count: Number(denominations['100']) || 0, value: (Number(denominations['100']) || 0) * 100 },
    { label: '₦50 / Others', count: Number(denominations['50']) || 0, value: (Number(denominations['50']) || 0) * 50 },
  ];

  const denomTableHtml = denomRows
    .map(
      (r) => `<tr>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${r.label}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${r.count}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 600;">${formatNgn(r.value)}</td>
      </tr>`
    )
    .join('');

  const varColor = varianceNgn === 0 ? '#166534' : varianceNgn > 0 ? '#b45309' : '#991b1b';
  const varStatus =
    varianceNgn === 0
      ? 'BALANCED (₦0)'
      : varianceNgn > 0
        ? `OVERAGE (+${formatNgn(varianceNgn)})`
        : `SHORTAGE (${formatNgn(varianceNgn)})`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Cashier EOD Balance Report - ${date}</title>
  <style>
    @media print {
      body { padding: 14px; font-size: 11px; }
      @page { size: A4 portrait; margin: 10mm; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      padding: 28px;
      max-width: 740px;
      margin: 0 auto;
      line-height: 1.45;
    }
    .header {
      border-bottom: 2.5px solid #134e4a;
      padding-bottom: 10px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title-box h1 {
      margin: 0;
      font-size: 18px;
      color: #134e4a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .title-box p {
      margin: 2px 0 0;
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 18px;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .stat-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .stat-val {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
      font-family: monospace;
    }
    .stat-sub {
      font-size: 10px;
      color: #64748b;
      margin-top: 1px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #134e4a;
      margin: 16px 0 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      padding: 6px 10px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
    }
    .comparison-banner {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 16px 0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      text-align: center;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-line {
      border-bottom: 1px solid #475569;
      height: 32px;
      margin-bottom: 6px;
    }
    .sig-label {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-box">
      <h1>Zarewa Aluminium &amp; Plastics Ltd</h1>
      <p>Cashier End-of-Day Till Balancing &amp; Safe Count (SOP-02 §3.3 &amp; §12)</p>
    </div>
    <div class="meta-box">
      <div>Date: <strong>${date}</strong></div>
      <div>Branch: <strong>${branch}</strong></div>
      <div>Cashier: <strong>${cashier}</strong></div>
    </div>
  </div>

  <div class="card-grid">
    <div class="stat-card">
      <div class="stat-label">Confirmed Receipts (Today)</div>
      <div class="stat-val">${formatNgn(confirmedReceiptsNgn)}</div>
      <div class="stat-sub">${confirmedReceiptsCount} cleared receipt(s)</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Payouts Executed (Today)</div>
      <div class="stat-val">${formatNgn(payoutsNgn)}</div>
      <div class="stat-sub">${payoutsCount} disbursement(s)</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">POS Terminal Balance</div>
      <div class="stat-val">${formatNgn(posBalanceNgn)}</div>
      <div class="stat-sub">Pending settlement</div>
    </div>
  </div>

  <div class="section-title">1. Physical Cash Safe Count (Denomination Breakdown)</div>
  <table>
    <thead>
      <tr>
        <th>Denomination</th>
        <th style="text-align: center;">Note Count</th>
        <th style="text-align: right;">Subtotal (₦)</th>
      </tr>
    </thead>
    <tbody>
      ${denomTableHtml}
    </tbody>
  </table>

  <div class="comparison-banner">
    <div>
      <div class="stat-label">A. Physical Cash Counted</div>
      <div class="stat-val" style="color: #0f172a;">${formatNgn(physicalCashNgn)}</div>
    </div>
    <div>
      <div class="stat-label">B. System Cash Till Balance</div>
      <div class="stat-val" style="color: #134e4a;">${formatNgn(bookCashNgn)}</div>
    </div>
    <div>
      <div class="stat-label">Variance (A - B)</div>
      <div class="stat-val" style="color: ${varColor};">${varStatus}</div>
    </div>
  </div>

  <div class="section-title">2. Queue Clearance &amp; Escalation Notes</div>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-size: 11px;">
    <p style="margin: 0 0 6px;"><strong>Pending Receipts Remaining:</strong> ${pendingReceiptsCount} item(s) (${formatNgn(pendingReceiptsNgn)})</p>
    <p style="margin: 0;"><strong>Cashier Remarks:</strong> ${safeNotes}</p>
  </div>

  <div class="signatures">
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Cashier Signature (${cashier})</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Confirmed physical cash count matches till safe</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Branch Manager Signature &amp; Date</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Verified closing safe balance &amp; queue status</div>
    </div>
  </div>
</body>
</html>`;

  return openPrintHtmlDocument(html, `Cashier-EOD-${date}`, { page: 'A4' });
}
