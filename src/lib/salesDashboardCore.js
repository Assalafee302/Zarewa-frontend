import { receiptCashReceivedNgn } from './salesReceiptsList';
import { refundOutstandingAmount } from './refundsStore';

function asDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isoMonth(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function normalizeSalesPipelineStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'requested';
  if (['draft', 'pending', 'requested'].includes(s)) return 'requested';
  if (['approved'].includes(s)) return 'approved';
  if (['paid', 'partial'].includes(s)) return 'paid';
  if (['delivered', 'completed', 'closed'].includes(s)) return 'delivered';
  if (['expired', 'void', 'rejected', 'cancelled', 'canceled'].includes(s)) return 'cancelled';
  return 'requested';
}

export function buildSalesDashboardModel({
  quotations = [],
  receipts = [],
  refunds = [],
  cuttingLists = [],
  productionJobs = [],
  customers = [],
  from,
  to,
}) {
  const now = new Date();
  const fromDate = asDate(from) || startOfMonth(now);
  const toDate = asDate(to) || now;
  const year = now.getFullYear();

  const qInRange = quotations.filter((q) => {
    const d = asDate(q?.dateISO || q?.date || q?.date_iso);
    return d && d >= fromDate && d <= toDate;
  });
  const rInRange = receipts.filter((r) => {
    const d = asDate(r?.dateISO || r?.date || r?.date_iso);
    return d && d >= fromDate && d <= toDate;
  });

  const salesMtdNgn = qInRange.reduce((s, q) => s + (Number(q?.totalNgn) || 0), 0);
  const salesYtdNgn = quotations.reduce((s, q) => {
    const d = asDate(q?.dateISO || q?.date || q?.date_iso);
    if (!d || d.getFullYear() !== year) return s;
    return s + (Number(q?.totalNgn) || 0);
  }, 0);
  const receiptsMtdNgn = rInRange.reduce((s, r) => s + (Number(receiptCashReceivedNgn(r)) || Number(r?.amountNgn) || 0), 0);
  const outstandingReceivablesNgn = quotations.reduce((s, q) => {
    const total = Number(q?.totalNgn) || 0;
    const paid = Number(q?.paidNgn) || 0;
    return s + Math.max(0, total - paid);
  }, 0);
  const pendingQuotations = quotations.filter((q) => normalizeSalesPipelineStatus(q?.status) === 'requested').length;
  const approvedQuotations = quotations.filter((q) => normalizeSalesPipelineStatus(q?.status) === 'approved').length;
  const paidQuotations = quotations.filter((q) => ['Paid', 'Partial'].includes(String(q?.paymentStatus || ''))).length;
  const quoteToCashRate = quotations.length > 0 ? paidQuotations / quotations.length : 0;
  const refundsPending = refunds.filter((r) => String(r?.status || '') === 'Pending').length;
  const refundsAwaitingPayout = refunds.filter((r) => String(r?.status || '') === 'Approved' && refundOutstandingAmount(r) > 0).length;
  const cuttingWaiting = cuttingLists.filter((c) => !c?.productionRegistered || c?.productionReleasePending).length;

  const customerMap = new Map();
  quotations.forEach((q) => {
    const id = String(q?.customerID || q?.customer_id || q?.customer || '').trim();
    if (!id) return;
    const curr = customerMap.get(id) || { paidNgn: 0, metres: 0 };
    curr.paidNgn += Number(q?.paidNgn) || 0;
    curr.metres += Number(q?.totalMeters ?? q?.meters ?? q?.total_meters ?? 0) || 0;
    customerMap.set(id, curr);
  });
  const customerRankRows = [...customerMap.entries()].map(([id, value]) => {
      const c = customers.find((x) => String(x?.customerID || x?.customer_id || x?.name || '') === id);
      return { id, name: c?.name || id, paidNgn: Number(value?.paidNgn) || 0, metres: Number(value?.metres) || 0 };
    });
  const topCustomersByPaid = [...customerRankRows]
    .sort((a, b) => b.paidNgn - a.paidNgn)
    .slice(0, 10);
  const topCustomersByMeters = [...customerRankRows]
    .sort((a, b) => b.metres - a.metres)
    .slice(0, 10);

  const revenueTrendMap = new Map();
  qInRange.forEach((q) => {
    const d = asDate(q?.dateISO || q?.date || q?.date_iso);
    if (!d) return;
    const key = isoMonth(d);
    revenueTrendMap.set(key, (revenueTrendMap.get(key) || 0) + (Number(q?.totalNgn) || 0));
  });
  const receiptTrendMap = new Map();
  rInRange.forEach((r) => {
    const d = asDate(r?.dateISO || r?.date || r?.date_iso);
    if (!d) return;
    const key = isoMonth(d);
    receiptTrendMap.set(key, (receiptTrendMap.get(key) || 0) + (Number(receiptCashReceivedNgn(r)) || Number(r?.amountNgn) || 0));
  });
  const monthKeys = [...new Set([...revenueTrendMap.keys(), ...receiptTrendMap.keys()])].sort();
  const revenueTrend = monthKeys.map((key) => ({
    key,
    salesNgn: revenueTrendMap.get(key) || 0,
    receiptsNgn: receiptTrendMap.get(key) || 0,
  }));

  const pipeline = ['requested', 'approved', 'paid', 'delivered', 'cancelled'].map((stage) => ({
    stage,
    count: quotations.filter((q) => normalizeSalesPipelineStatus(q?.status) === stage).length,
  }));

  const aging = { '0_30': 0, '31_60': 0, '61_90': 0, over_90: 0 };
  quotations.forEach((q) => {
    const due = asDate(q?.dateISO || q?.date || q?.date_iso);
    if (!due) return;
    const outstanding = Math.max(0, (Number(q?.totalNgn) || 0) - (Number(q?.paidNgn) || 0));
    if (!(outstanding > 0)) return;
    const days = Math.floor((now.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
    if (days <= 30) aging['0_30'] += outstanding;
    else if (days <= 60) aging['31_60'] += outstanding;
    else if (days <= 90) aging['61_90'] += outstanding;
    else aging.over_90 += outstanding;
  });

  const demandMix = new Map();
  productionJobs.forEach((j) => {
    const key = String(j?.materialType || j?.productType || j?.productID || 'Other');
    const row = demandMix.get(key) || { key, metres: 0, valueNgn: 0 };
    row.metres += Number(j?.actualMeters || j?.plannedMeters || 0) || 0;
    row.valueNgn += Number(j?.revenueNgn || 0) || 0;
    demandMix.set(key, row);
  });
  const demandMixRows = [...demandMix.values()].sort((a, b) => b.valueNgn - a.valueNgn).slice(0, 12);

  const bookedVsProduced = {
    bookedNgn: quotations.reduce((s, q) => s + (Number(q?.totalNgn) || 0), 0),
    producedMeters: productionJobs.reduce((s, j) => s + (Number(j?.actualMeters || j?.plannedMeters || 0) || 0), 0),
    producedValueNgn: productionJobs.reduce((s, j) => s + (Number(j?.revenueNgn || 0) || 0), 0),
  };

  const alerts = [];
  if (outstandingReceivablesNgn > 0) alerts.push({ severity: 'medium', type: 'receivables', message: 'Outstanding receivables require collection follow-up.', amountNgn: outstandingReceivablesNgn });
  if (refundsAwaitingPayout > 0) alerts.push({ severity: 'medium', type: 'refunds', message: `${refundsAwaitingPayout} approved refund(s) awaiting payout.` });
  if (cuttingWaiting > 0) alerts.push({ severity: 'low', type: 'cutting_wait', message: `${cuttingWaiting} cutting list(s) still waiting for production/material flow.` });

  return {
    kpis: {
      salesMtdNgn,
      salesYtdNgn,
      receiptsMtdNgn,
      outstandingReceivablesNgn,
      pendingQuotations,
      approvedQuotations,
      paidQuotations,
      quoteToCashRate,
      refundsPending,
      refundsAwaitingPayout,
      cuttingWaiting,
      topCustomerValueNgn: topCustomersByPaid[0]?.paidNgn || 0,
      topCustomerName: topCustomersByPaid[0]?.name || '—',
      producedMeters: bookedVsProduced.producedMeters,
      producedValueNgn: bookedVsProduced.producedValueNgn,
    },
    charts: {
      revenueTrend,
      pipeline,
      topCustomers: topCustomersByPaid,
      topCustomersByPaid,
      topCustomersByMeters,
      receivablesAging: aging,
      demandMix: demandMixRows,
      bookedVsProduced,
    },
    alerts,
  };
}

