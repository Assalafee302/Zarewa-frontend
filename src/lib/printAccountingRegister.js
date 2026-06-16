import { formatNgn } from '../Data/mockData';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Print creditors or debtors register summary.
 * @param {{ data: object; registerSide: 'creditor' | 'debtor'; title: string; branchScopeLabel?: string }} opts
 * @returns {boolean}
 */
export function printAccountingRegister({ data, registerSide, title, branchScopeLabel }) {
  if (!data?.sections?.length) return false;

  const printedAt = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const sideLabel = registerSide === 'creditor' ? 'Creditors (amounts owed to Zarewa)' : 'Debtors (amounts owed by Zarewa)';

  const summaryRows = (data.sections || [])
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.title)}</td>
        <td class="num">${s.count ?? 0}</td>
        <td class="num">${escapeHtml(formatNgn(s.subtotalNgn ?? 0))}</td>
      </tr>`
    )
    .join('');

  const detailSections = (data.sections || [])
    .map((s) => {
      const rows = (s.items || [])
        .map(
          (i) => `
        <tr>
          <td>${escapeHtml(i.partyName || '—')}</td>
          <td>${escapeHtml(i.partyRef || '')}</td>
          <td>${escapeHtml(i.reference || '')}</td>
          <td>${escapeHtml(i.branchId || '')}</td>
          <td class="num">${escapeHtml(formatNgn(i.amountNgn ?? 0))}</td>
          <td>${escapeHtml(i.asAtDateIso || '')}</td>
          <td>${escapeHtml(i.detail || i.description || '')}</td>
        </tr>`
        )
        .join('');
      if (!rows) return '';
      return `
        <h2>${escapeHtml(s.title)} — ${escapeHtml(formatNgn(s.subtotalNgn ?? 0))}</h2>
        <table>
          <thead>
            <tr>
              <th>Party</th><th>Ref</th><th>Reference</th><th>Branch</th><th>Amount</th><th>As-at</th><th>Detail</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    })
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:11px;color:#0f172a;padding:24px;max-width:1100px;margin:0 auto;}
  h1{font-size:18px;color:#134e4a;margin:0 0 4px;}
  .meta{font-size:10px;color:#64748b;margin-bottom:20px;line-height:1.5;}
  h2{font-size:12px;color:#134e4a;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;}
  th,td{border:1px solid #e2e8f0;padding:5px 6px;text-align:left;vertical-align:top;}
  th{background:#f8fafc;font-size:9px;text-transform:uppercase;letter-spacing:.04em;}
  td.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;}
  .total{font-size:14px;font-weight:800;color:#134e4a;margin:12px 0;}
  .footnote{font-size:9px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:.04em;}
  @media print{body{padding:0;}}
</style></head><body>
  <p class="footnote">Internal register · ${escapeHtml(branchScopeLabel || data.branchScope || 'Company-wide')}</p>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">${escapeHtml(sideLabel)}<br/>
  Scope: ${escapeHtml(branchScopeLabel || data.branchScope || 'Company-wide')} · Printed ${escapeHtml(printedAt)}<br/>
  ${data.generatedAtISO ? `Register generated ${escapeHtml(new Date(data.generatedAtISO).toLocaleString())}` : ''}</p>
  <p class="total">Total register: ${escapeHtml(formatNgn(data.summary?.totalNgn ?? 0))}</p>
  <h2>Section summary</h2>
  <table>
    <thead><tr><th>Section</th><th>Lines</th><th>Subtotal</th></tr></thead>
    <tbody>${summaryRows}</tbody>
  </table>
  ${detailSections}
  <p class="meta" style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;">
    ${(data.notes || []).map((n) => escapeHtml(n)).join(' · ')}
  </p>
</body></html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.onload = () => {
    w.print();
  };
  return true;
}
