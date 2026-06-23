import { escapeHtml } from './officeDeskPrint.js';

/**
 * Printable chairman / board summary from executive dashboard data.
 */
export function buildMdChairmanPackHtml({
  monthKey,
  branchScopeLabel,
  period,
  kpis,
  mdOperationsMonth,
  branches,
  champion,
  narrative,
  generatedAtISO,
  formatNgn,
}) {
  const fmt = formatNgn || ((n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`);
  const counts = mdOperationsMonth?.counts || {};
  const limits = mdOperationsMonth?.limits || {};
  const branchRows = (branches?.byBranch || []).slice(0, 6);
  const highlights = branches?.highlights || {};

  const branchTable = branchRows.length
    ? `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
        <thead><tr style="border-bottom:1px solid #cbd5e1;text-align:left">
          <th style="padding:6px 4px">Branch</th>
          <th style="padding:6px 4px;text-align:right">Sales</th>
          <th style="padding:6px 4px;text-align:right">Collections</th>
          <th style="padding:6px 4px;text-align:right">Debt</th>
        </tr></thead>
        <tbody>
          ${branchRows
            .map(
              (b) => `<tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:6px 4px">${escapeHtml(b.branchName || b.branchId || '—')}</td>
                <td style="padding:6px 4px;text-align:right">${escapeHtml(fmt(b.salesNgn ?? 0))}</td>
                <td style="padding:6px 4px;text-align:right">${escapeHtml(fmt(b.collectionsNgn ?? 0))}</td>
                <td style="padding:6px 4px;text-align:right">${escapeHtml(fmt(b.debtNgn ?? 0))}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>`
    : '<p style="color:#64748b;font-size:12px">Branch comparison not available for this scope.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Chairman summary — ${escapeHtml(monthKey || '')}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #0f172a; margin: 32px; line-height: 1.5; }
    h1 { font-size: 22px; color: #134e4a; margin: 0 0 4px; }
    h2 { font-size: 14px; color: #134e4a; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.06em; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .card label { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .card strong { font-size: 16px; color: #134e4a; }
    .narrative { white-space: pre-wrap; border-left: 3px solid #134e4a; padding: 12px 16px; background: #f8fafc; font-size: 13px; }
    .exceptions ul { margin: 8px 0; padding-left: 18px; font-size: 12px; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>Zarewa Aluminium &amp; Plastics</h1>
  <p class="meta">Managing Director summary · ${escapeHtml(monthKey || '')} · ${escapeHtml(branchScopeLabel || 'Company-wide')}
    ${period?.startISO && period?.endISO ? `<br/>Period: ${escapeHtml(period.startISO)} – ${escapeHtml(period.endISO)}` : ''}
    ${generatedAtISO ? `<br/>Generated ${escapeHtml(new Date(generatedAtISO).toLocaleString())}` : ''}
  </p>

  <h2>Performance snapshot</h2>
  <div class="grid">
    <div class="card"><label>Sales (period)</label><strong>${escapeHtml(fmt(kpis?.salesNgn ?? 0))}</strong></div>
    <div class="card"><label>Collections</label><strong>${escapeHtml(fmt(kpis?.collectionsNgn ?? 0))}</strong></div>
    <div class="card"><label>Outstanding receivables</label><strong>${escapeHtml(fmt(kpis?.outstandingReceivablesNgn ?? 0))}</strong></div>
    <div class="card"><label>Pending MD actions</label><strong>${escapeHtml(String(kpis?.pendingExecutiveActions ?? 0))}</strong></div>
    <div class="card"><label>Critical alerts</label><strong>${escapeHtml(String(kpis?.criticalAlerts ?? 0))}</strong></div>
    <div class="card"><label>Champion customer</label><strong>${escapeHtml(champion?.customerName || '—')}</strong></div>
  </div>

  <h2>MD narrative</h2>
  <div class="narrative">${escapeHtml(narrative?.trim() || '— No narrative saved for this month —')}</div>

  <h2>Exception counts (month)</h2>
  <div class="exceptions">
    <ul>
      <li>Approved payments above ₦${escapeHtml(String(limits.expenseExecutiveThresholdNgn ?? 200000).replace(/\B(?=(\d{3})+(?!\d))/g, ','))}: <strong>${escapeHtml(String(counts.approvedPaymentRequestsAboveExpenseThreshold ?? 0))}</strong></li>
      <li>Refunds pending: <strong>${escapeHtml(String(counts.refundsPendingInMonth ?? 0))}</strong></li>
      <li>Unfiled completed work items: <strong>${escapeHtml(String(counts.unfiledWorkItemsIncomplete ?? 0))}</strong></li>
      <li>Open inter-branch requests: <strong>${escapeHtml(String(counts.interBranchRequestsOpen ?? 0))}</strong></li>
      <li>Material incidents awaiting approval: <strong>${escapeHtml(String(counts.materialIncidentsPendingApproval ?? 0))}</strong></li>
    </ul>
  </div>

  <h2>Branch scorecard</h2>
  ${highlights?.leadingBranchName ? `<p style="font-size:12px">Leading branch: <strong>${escapeHtml(highlights.leadingBranchName)}</strong></p>` : ''}
  ${branchTable}

  <p class="meta" style="margin-top:32px">Confidential — for chairman / board review. Operational detail remains in Zarewa ERP.</p>
</body>
</html>`;
}
