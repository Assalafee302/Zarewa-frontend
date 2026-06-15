import { normQuoteKeyForLiveJob } from './productionLiveJobMaterialKind.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findQuotation(quotations, quotationRef) {
  const key = normQuoteKeyForLiveJob(quotationRef);
  if (!key) return null;
  return (
    (quotations || []).find((row) => row?.id && normQuoteKeyForLiveJob(row.id) === key) || null
  );
}

function materialFromQuotation(q) {
  if (!q) {
    return { projectName: '—', colour: '—', gauge: '—' };
  }
  const projectName = String(q.projectName ?? q.project_name ?? '').trim();
  const colour = String(q.materialColor ?? q.material_color ?? q.color ?? '').trim();
  const gauge = String(q.materialGauge ?? q.material_gauge ?? q.gauge ?? '').trim();
  return {
    projectName: projectName || '—',
    colour: colour || '—',
    gauge: gauge || '—',
  };
}

/** @param {object[]} followUpFlags */
function followUpNotes(row) {
  const parts = [];
  if (row.coilLabel) parts.push(row.coilLabel);
  if (row.needsCoil) parts.push('No coil allocated');
  if (row.managerReviewRequired) parts.push('Manager review');
  if (row.overdue) parts.push('Overdue');
  if (row.priority === 'High') parts.push('High priority');
  if (row.quantity) parts.push(row.quantity);
  return parts.length ? parts.join(' · ') : '—';
}

/**
 * Enrich production queue rows with quotation project / colour / gauge for print.
 * @param {object[]} rows
 * @param {object[]} [quotations]
 */
export function enrichProductionFollowUpRows(rows, quotations = []) {
  return (rows || []).map((row) => {
    const q = findQuotation(quotations, row.quotationRef);
    const mat = materialFromQuotation(q);
    return {
      quotationRef: String(row.quotationRef || '').trim() || '—',
      cuttingListId: String(row.cuttingListId || row.id || '').trim() || '—',
      customer: String(row.customer || '—').trim() || '—',
      projectName: mat.projectName,
      colour: mat.colour,
      gauge: mat.gauge,
      lineStatus: String(row.lineStatusLabel || '—').trim() || '—',
      jobStatus: String(row.status || '—').trim() || '—',
      followUp: followUpNotes(row),
    };
  });
}

/**
 * Print waiting / in-production jobs for shop-floor follow-up.
 * @param {{ rows: object[]; quotations?: object[]; title?: string }} opts
 * @returns {boolean} false if popup blocked or no rows
 */
export function printProductionFollowUpList({ rows, quotations = [], title }) {
  const source = Array.isArray(rows) ? rows : [];
  if (!source.length) return false;

  const enriched = enrichProductionFollowUpRows(source, quotations);
  const printedAt = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const docTitle = title || 'Production follow-up — waiting & in progress';

  const bodyRows = enriched
    .map(
      (r, idx) => `<tr>
  <td class="num">${idx + 1}</td>
  <td class="mono">${escapeHtml(r.quotationRef)}</td>
  <td class="mono">${escapeHtml(r.cuttingListId)}</td>
  <td>${escapeHtml(r.customer)}</td>
  <td>${escapeHtml(r.projectName)}</td>
  <td>${escapeHtml(r.colour)}</td>
  <td>${escapeHtml(r.gauge)}</td>
  <td>${escapeHtml(r.lineStatus)}</td>
  <td>${escapeHtml(r.jobStatus)}</td>
  <td class="notes">${escapeHtml(r.followUp)}</td>
</tr>`
    )
    .join('');

  const w = window.open('', '_blank');
  if (!w) return false;

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(docTitle)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body{font-family:system-ui,-apple-system,sans-serif;padding:20px;color:#111;max-width:100%;margin:0 auto;font-size:11px;}
  h1{font-size:18px;margin:0 0 4px;color:#134e4a;}
  .sub{color:#444;font-size:11px;margin-bottom:14px;line-height:1.45;}
  table{width:100%;border-collapse:collapse;margin:10px 0;font-size:10px;}
  th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;vertical-align:top;}
  th{background:#e8f5f3;font-weight:700;color:#134e4a;font-size:9px;text-transform:uppercase;letter-spacing:0.03em;}
  tr:nth-child(even) td{background:#fafafa;}
  .num{text-align:center;width:2em;font-variant-numeric:tabular-nums;}
  .mono{font-family:ui-monospace,monospace;font-weight:600;}
  .notes{max-width:14rem;font-size:9px;color:#333;}
  @media print{body{padding:0;} thead{display:table-header-group;}}
</style></head><body>
  <h1>${escapeHtml(docTitle)}</h1>
  <p class="sub">Printed ${escapeHtml(printedAt)} · ${enriched.length} job(s) — use for follow-up on jobs not yet produced or still on the line.</p>
  <table>
    <thead><tr>
      <th>#</th>
      <th>Quotation</th>
      <th>Cutting list</th>
      <th>Customer</th>
      <th>Project</th>
      <th>Colour</th>
      <th>Gauge</th>
      <th>Line status</th>
      <th>Job status</th>
      <th>Follow-up notes</th>
    </tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body></html>`);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
