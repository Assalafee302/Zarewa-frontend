import { apiUrl } from './apiBase.js';

/**
 * Download expense category exceptions CSV for the current month.
 * @param {{ branchScope?: string; viewAllBranches?: boolean }} wsSlice
 */
export async function downloadExpenseCategoryExceptionsCsv(wsSlice = {}) {
  const now = new Date();
  const startISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const endISO = now.toISOString().slice(0, 10);
  const branchQ =
    wsSlice.viewAllBranches && wsSlice.branchScope === 'ALL'
      ? ''
      : `&branchScope=${encodeURIComponent(wsSlice.branchScope || '')}`;

  const r = await fetch(
    apiUrl(
      `/api/reports/expense-category-exceptions?format=csv&startDate=${startISO}&endDate=${endISO}${branchQ}`
    ),
    { credentials: 'include' }
  );
  if (!r.ok) throw new Error('export_failed');
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expense-category-exceptions-${endISO}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
