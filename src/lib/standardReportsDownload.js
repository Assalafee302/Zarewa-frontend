import * as XLSX from 'xlsx';

function q(startDate, endDate) {  return `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
}

function qAs(asAt, startDate, endDate) {
  const a = asAt || endDate;
  return `${q(startDate, endDate)}&asAtDate=${encodeURIComponent(a)}`;
}

/**
 * @param {(path: string, init?: RequestInit) => Promise<{ ok: boolean; data?: any }>} apiFetch
 */
export async function downloadStandardSalesWorkbook(apiFetch, startDate, endDate, showToast) {
  const wb = XLSX.utils.book_new();
  let n = 0;
  const [r1, r2, r3, r4] = await Promise.all([
    apiFetch(`/api/reports/receipts-register?${q(startDate, endDate)}`),
    apiFetch(`/api/reports/revenue-production?${q(startDate, endDate)}`),
    apiFetch(`/api/reports/ar-as-at?asAtDate=${encodeURIComponent(endDate)}`),
    apiFetch(`/api/reports/sales-bridge?${qAs(endDate, startDate, endDate)}`),
  ]);
  const packs = [
    { name: 'Receipts', res: r1, key: 'rows' },
    { name: 'Revenue_production', res: r2, key: 'rows' },
    { name: 'AR_as_at', res: r3, key: 'rows' },
    { name: 'Sales_bridge', res: r4, key: 'rows' },
  ];
  for (const p of packs) {
    if (!p.res.ok || !p.res.data?.ok || !Array.isArray(p.res.data[p.key]) || !p.res.data[p.key].length) continue;
    const sheet = p.name.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(p.res.data[p.key]), sheet);
    n += 1;
  }
  if (!n) {
    showToast?.('No standard sales sheets had rows for this period.', { variant: 'info' });
    return;
  }
  XLSX.writeFile(wb, `standard-sales-${startDate}-to-${endDate}.xlsx`);
  showToast?.(`Standard sales workbook (${n} sheet(s)).`);
}

export async function downloadStandardFinanceWorkbook(apiFetch, startDate, endDate, showToast) {
  const wb = XLSX.utils.book_new();
  let n = 0;
  const [ex, rf] = await Promise.all([
    apiFetch(`/api/reports/expenses-pack?${q(startDate, endDate)}`),
    apiFetch(`/api/reports/refunds-pack?${q(startDate, endDate)}`),
  ]);
  if (ex.ok && ex.data?.ok) {
    if (ex.data.detail?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ex.data.detail), 'Expenses_detail');
      n += 1;
    }
    if (ex.data.summaryByCategory?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ex.data.summaryByCategory), 'Expenses_summary');
      n += 1;
    }
  }
  if (rf.ok && rf.data?.ok) {
    if (rf.data.paidInPeriod?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rf.data.paidInPeriod), 'Refunds_paid');
      n += 1;
    }
    if (rf.data.pipeline?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rf.data.pipeline), 'Refunds_pipeline');
      n += 1;
    }
    if (rf.data.summary && n > 0) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([rf.data.summary]),
        'Refunds_summary'
      );
      n += 1;
    }
  }
  if (!n) {
    showToast?.('No expenses/refunds rows for this period.', { variant: 'info' });
    return;
  }
  XLSX.writeFile(wb, `standard-finance-${startDate}-to-${endDate}.xlsx`);
  showToast?.(`Standard finance workbook (${n} sheet(s)).`);
}

export async function downloadStandardPurchasesWorkbook(apiFetch, startDate, endDate, showToast) {
  const wb = XLSX.utils.book_new();
  let n = 0;
  for (const cut of ['received', 'ordered', 'paid']) {
    const { ok, data } = await apiFetch(`/api/reports/purchases?cut=${cut}&${q(startDate, endDate)}`);
    if (!ok || !data?.ok || !data.rows?.length) continue;
    const sheet = `Purch_${cut}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.rows), sheet);
    n += 1;
  }
  if (!n) {
    showToast?.('No purchase rows for this period.', { variant: 'info' });
    return;
  }
  XLSX.writeFile(wb, `standard-purchases-${startDate}-to-${endDate}.xlsx`);
  showToast?.(`Standard purchases workbook (${n} sheet(s)).`);
}

export async function downloadStandardStockWorkbook(apiFetch, endDate, showToast) {
  const { ok, data } = await apiFetch(
    `/api/reports/stock-coil-as-at?asAtDate=${encodeURIComponent(endDate)}`
  );
  if (!ok || !data?.ok || !data.rows?.length) {
    showToast?.(data?.error || 'No stock rows.', { variant: 'info' });
    return;
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.rows), 'Coil_stock');
  const meta = [
    { key: 'asAtMode', value: data.asAtMode },
    { key: 'asAtDate', value: data.asAtDate },
    { key: 'note', value: data.disclaimer || '' },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(meta), 'Meta');
  XLSX.writeFile(wb, `standard-stock-as-at-${endDate}.xlsx`);
  showToast?.(`Stock (${data.asAtMode}) downloaded.`);
}
