import { ZAREWA_COMPANY_ACCOUNT_NAME, ZAREWA_LOGO_SRC } from '../Data/companyQuotation.js';

/**
 * @typedef {{ gaugeMm: string; stdKgPerM?: string; refKgPerM?: string; histKgPerM?: string; usedKgPerM?: string; costPerKgNgn: string; suggestedNgn: number | null; minimumNgn: number }} MaterialPricingPrintRow
 */

/**
 * Opens a print preview of the material pricing sheet (rows that have prices only).
 * @param {{
 *   materialLabel: string;
 *   branchName: string;
 *   rows: MaterialPricingPrintRow[];
 *   formatNgn: (n: number) => string;
 * }} opts
 * @returns {boolean} false if pop-up blocked
 */
export function printMaterialPricingWorkbookSummary({ materialLabel, branchName, rows, formatNgn }) {
  const w = window.open('', '_blank');
  if (!w) return false;

  const origin = window.location.origin || '';
  const logoUrl = `${origin}${ZAREWA_LOGO_SRC}`;
  const printed = new Date().toLocaleString();

  const bodyRows = rows.length
    ? rows
        .map((r) => {
          const sug =
            r.suggestedNgn != null && Number.isFinite(r.suggestedNgn) && r.suggestedNgn > 0
              ? formatNgn(r.suggestedNgn)
              : '—';
          const floor =
            r.minimumNgn != null && Number.isFinite(r.minimumNgn) && r.minimumNgn > 0
              ? formatNgn(r.minimumNgn)
              : '—';
          const used = r.usedKgPerM && r.usedKgPerM !== '—' ? r.usedKgPerM : '—';
          const ck = String(r.costPerKgNgn || '').trim() || '—';
          const std = r.stdKgPerM && r.stdKgPerM !== '—' ? r.stdKgPerM : '—';
          const ref = r.refKgPerM && r.refKgPerM !== '—' ? r.refKgPerM : '—';
          const hist = r.histKgPerM && r.histKgPerM !== '—' ? r.histKgPerM : '—';
          return `<tr>
  <td><strong>${escapeHtml(r.gaugeMm)}</strong> mm</td>
  <td class="num">${escapeHtml(std)}</td>
  <td class="num">${escapeHtml(ref)}</td>
  <td class="num">${escapeHtml(hist)}</td>
  <td class="num">${escapeHtml(used)}</td>
  <td class="num">${escapeHtml(ck)}</td>
  <td class="num">${escapeHtml(sug)}</td>
  <td class="num">${escapeHtml(floor)}</td>
</tr>`;
        })
        .join('')
    : `<tr><td colspan="8" class="muted">No gauges with a suggested or minimum price to list.</td></tr>`;

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(materialLabel)} — material pricing</title>
<style>
  body{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px 28px;color:#0f172a;max-width:920px;margin:0 auto;}
  .head{display:flex;align-items:center;gap:16px;margin-bottom:8px;}
  .head img{height:52px;width:auto;object-fit:contain;}
  .brand h1{font-size:18px;margin:0;font-weight:800;color:#134e4a;letter-spacing:-0.02em;}
  .brand p{margin:2px 0 0;font-size:11px;color:#475569;}
  .meta{font-size:12px;color:#334155;margin:16px 0 12px;line-height:1.5;}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;}
  th,td{border:1px solid #94a3b8;padding:8px 10px;text-align:left;}
  th{background:#e2e8f0;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:0.04em;color:#334155;}
  .num{text-align:right;font-variant-numeric:tabular-nums;}
  .muted{color:#64748b;}
  .foot{margin-top:20px;font-size:10px;color:#64748b;}
  @media print{body{padding:12px 16px;}}
</style></head><body>
  <div class="head">
    <img src="${escapeHtml(logoUrl)}" alt="" onerror="this.style.display='none'"/>
    <div class="brand">
      <h1>${escapeHtml(ZAREWA_COMPANY_ACCOUNT_NAME)}</h1>
      <p>Material pricing workbook</p>
    </div>
  </div>
  <div class="meta">
    <strong>Material:</strong> ${escapeHtml(materialLabel)}<br/>
    <strong>Branch:</strong> ${escapeHtml(branchName)}<br/>
    <strong>Printed:</strong> ${escapeHtml(printed)}
  </div>
  <p style="font-size:11px;color:#64748b;margin:0 0 8px;">Conversions kg/m to two decimal places (data-driven). Listed gauges have a suggested and/or minimum floor price.</p>
  <table>
    <thead>
      <tr>
        <th>Gauge</th>
        <th class="num">Std</th>
        <th class="num">Ref</th>
        <th class="num">Hist</th>
        <th class="num">Used</th>
        <th class="num">₦/kg</th>
        <th class="num">Suggested ₦/m</th>
        <th class="num">Min floor ₦/m</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <p class="foot">Zarewa — internal pricing reference. Customer-facing list: Pricing policy → Customer price book. Quotations below published minima require MD approval where applicable.</p>
</body></html>`);
  w.document.close();
  w.focus();
  const triggerPrint = () => {
    try {
      w.focus();
      w.print();
    } catch {
      /* keep tab open */
    }
  };
  if (w.document.readyState === 'complete') queueMicrotask(triggerPrint);
  else w.onload = triggerPrint;
  return true;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
