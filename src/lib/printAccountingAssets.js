import { formatNgn } from '../Data/mockData';
import { openPrintHtmlDocument } from './officeDeskPrint';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {{ assets: object[]; summary: object; branchScopeLabel?: string; categoryLabel?: string }} opts
 * @returns {boolean}
 */
export function printAccountingAssets({ assets, summary, branchScopeLabel, categoryLabel }) {
  if (!assets?.length) return false;

  const printedAt = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const rows = assets
    .map(
      (a) => `
    <tr>
      <td>${escapeHtml(a.name)}</td>
      <td>${escapeHtml(a.category)}</td>
      <td>${escapeHtml(a.branchId || '')}</td>
      <td>${escapeHtml(String(a.acquisitionDateIso || '').slice(0, 10))}</td>
      <td class="num">${escapeHtml(formatNgn(a.costNgn))}</td>
      <td class="num">${escapeHtml(formatNgn(a.accumulatedDepreciationNgn))}</td>
      <td class="num">${escapeHtml(formatNgn(a.netBookValueNgn))}</td>
      <td>${escapeHtml(a.status)}</td>
    </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Fixed assets register</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:11px;color:#0f172a;padding:24px;max-width:1100px;margin:0 auto;}
  h1{font-size:18px;color:#134e4a;margin:0 0 4px;}
  .meta{font-size:10px;color:#64748b;margin-bottom:16px;line-height:1.5;}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;}
  th,td{border:1px solid #e2e8f0;padding:5px 6px;text-align:left;vertical-align:top;}
  th{background:#f8fafc;font-size:9px;text-transform:uppercase;letter-spacing:.04em;}
  td.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;}
  .total{font-size:13px;font-weight:800;color:#134e4a;margin:8px 0 16px;}
  .footnote{font-size:9px;color:#64748b;text-transform:uppercase;font-weight:600;}
  @media print{body{padding:0;}}
</style></head><body>
  <p class="footnote">Fixed assets register · ${escapeHtml(branchScopeLabel || 'Company-wide')}${categoryLabel ? ` · ${escapeHtml(categoryLabel)}` : ''}</p>
  <h1>Fixed assets register</h1>
  <p class="meta">Printed ${escapeHtml(printedAt)} · ${assets.length} asset(s)</p>
  <p class="total">Total NBV: ${escapeHtml(formatNgn(summary?.nbvNgn ?? 0))} · Cost ${escapeHtml(formatNgn(summary?.costNgn ?? 0))} · Accum. dep. ${escapeHtml(formatNgn(summary?.accumulatedNgn ?? 0))}</p>
  <table>
    <thead><tr><th>Name</th><th>Category</th><th>Branch</th><th>Acquired</th><th>Cost</th><th>Accum. dep.</th><th>NBV</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;

  return openPrintHtmlDocument(html, 'Fixed assets register');
}
