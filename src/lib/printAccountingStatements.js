import { formatNgn } from '../Data/mockData';
import { escapeHtml, openPrintHtmlDocument } from './officeDeskPrint';

/**
 * Print management draft P&L and balance sheet (browser print / Save as PDF).
 * @param {{ data: object; branchScopeLabel?: string }} opts
 * @returns {boolean}
 */
export function printAccountingStatements({ data, branchScopeLabel = '' }) {
  if (!data?.profitAndLoss && !data?.balanceSheet) return false;

  const pl = data.profitAndLoss;
  const bs = data.balanceSheet;
  const printedAt = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const scope = branchScopeLabel || data.branchScope || 'Company-wide';

  const plRows = (pl?.lines || [])
    .map(
      (r) => `
      <tr>
        <td class="mono">${escapeHtml(r.accountCode)}</td>
        <td>${escapeHtml(r.accountName)}</td>
        <td class="num">${escapeHtml(formatNgn(r.amountNgn))}</td>
      </tr>`
    )
    .join('');

  const bsRows = (bs?.lines || [])
    .map(
      (r) => `
      <tr>
        <td class="mono">${escapeHtml(r.accountCode)}</td>
        <td>${escapeHtml(r.accountName)}</td>
        <td>${escapeHtml(r.accountType || '')}</td>
        <td class="num">${escapeHtml(formatNgn(r.balanceNgn))}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Statements ${escapeHtml(data.periodKey || '')}</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:11px;color:#0f172a;padding:28px;max-width:900px;margin:0 auto;}
  h1{font-size:20px;color:#134e4a;margin:0 0 4px;}
  h2{font-size:13px;color:#134e4a;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;}
  .meta{font-size:10px;color:#64748b;margin-bottom:20px;line-height:1.6;}
  .kpi{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0;}
  .kpi div{flex:1;min-width:140px;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;background:#f8fafc;}
  .kpi dt{font-size:9px;text-transform:uppercase;font-weight:700;color:#64748b;}
  .kpi dd{margin:4px 0 0;font-size:14px;font-weight:800;color:#134e4a;}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;}
  th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top;}
  th{background:#f8fafc;font-size:9px;text-transform:uppercase;letter-spacing:.04em;}
  td.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;}
  td.mono{font-family:ui-monospace,monospace;font-size:10px;color:#475569;}
  .footnote{font-size:9px;color:#64748b;margin-top:24px;text-transform:uppercase;font-weight:600;letter-spacing:.04em;}
  @media print{body{padding:0;}}
</style></head><body>
  <p class="footnote">Management draft · not statutory · ${escapeHtml(scope)}</p>
  <h1>Financial statements — ${escapeHtml(data.periodKey || '')}</h1>
  <p class="meta">
    ${escapeHtml(data.label || 'Management draft from general ledger')}<br/>
    Period ${escapeHtml(data.range?.start || '')} → ${escapeHtml(data.range?.end || '')}<br/>
    Printed ${escapeHtml(printedAt)}
  </p>
  <dl class="kpi">
    <div><dt>Revenue</dt><dd>${escapeHtml(formatNgn(pl?.revenueTotalNgn))}</dd></div>
    <div><dt>Expenses</dt><dd>${escapeHtml(formatNgn(pl?.expenseTotalNgn))}</dd></div>
    <div><dt>Net income</dt><dd>${escapeHtml(formatNgn(pl?.netIncomeNgn))}</dd></div>
    <div><dt>Balance sheet</dt><dd>${bs?.balanced ? 'Balanced' : 'Review'}</dd></div>
  </dl>
  <h2>Profit &amp; Loss</h2>
  <table>
    <thead><tr><th>Code</th><th>Account</th><th>Amount</th></tr></thead>
    <tbody>${plRows || '<tr><td colspan="3">No P&amp;L activity</td></tr>'}</tbody>
    <tfoot>
      <tr><td colspan="2"><strong>Net income</strong></td><td class="num"><strong>${escapeHtml(formatNgn(pl?.netIncomeNgn))}</strong></td></tr>
    </tfoot>
  </table>
  <h2>Statement of financial position</h2>
  <p class="meta">As at ${escapeHtml(data.range?.end || '')} · Assets ${escapeHtml(formatNgn(bs?.assetsNgn))} · L+E ${escapeHtml(formatNgn(bs?.totalLiabilitiesAndEquityNgn))}</p>
  <table>
    <thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Balance</th></tr></thead>
    <tbody>${bsRows || '<tr><td colspan="4">No balance sheet balances</td></tr>'}</tbody>
  </table>
</body></html>`;

  return openPrintHtmlDocument(html, `Statements ${data.periodKey || ''}`);
}
