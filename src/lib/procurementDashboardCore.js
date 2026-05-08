import { purchaseOrderOrderedValueNgn } from './liveAnalytics';
import { procurementKindFromPo } from './procurementPoKind';

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizePoStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'requested';
  if (['draft', 'pending', 'pending approval', 'requested'].includes(s)) return 'requested';
  if (['approved'].includes(s)) return 'approved';
  if (['ordered'].includes(s)) return 'ordered';
  if (['on loading', 'in transit', 'dispatched'].includes(s)) return 'dispatched';
  if (['received'].includes(s)) return 'received';
  if (['closed'].includes(s)) return 'closed';
  if (['cancelled', 'canceled'].includes(s)) return 'cancelled';
  if (['rejected'].includes(s)) return 'rejected';
  return 'ordered';
}

function asDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function buildProcurementDashboardModel({
  purchaseOrders = [],
  suppliers = [],
  accountsPayable = [],
  products = [],
  inTransitLoads = [],
  from,
  to,
}) {
  const now = new Date();
  const fromDate = asDate(from) || startOfMonth(now);
  const toDate = asDate(to) || now;
  const today = now.toISOString().slice(0, 10);
  const currentYear = now.getFullYear();

  const pos = purchaseOrders.filter((po) => {
    const d = asDate(po?.orderDateISO);
    if (!d) return false;
    return d >= fromDate && d <= toDate;
  });
  const nonRejected = pos.filter((po) => normalizePoStatus(po?.status) !== 'rejected');

  const totalPurchasesMonthNgn = nonRejected.reduce((s, po) => s + purchaseOrderOrderedValueNgn(po), 0);
  const totalPurchasesYearNgn = purchaseOrders.reduce((s, po) => {
    const d = asDate(po?.orderDateISO);
    if (!d || d.getFullYear() !== currentYear) return s;
    return normalizePoStatus(po?.status) === 'rejected' ? s : s + purchaseOrderOrderedValueNgn(po);
  }, 0);
  const pendingPoCount = nonRejected.filter((po) => normalizePoStatus(po?.status) === 'requested').length;
  const approvedPoCount = nonRejected.filter((po) => normalizePoStatus(po?.status) === 'approved').length;
  const outstandingSupplierPaymentsNgn = nonRejected.reduce((s, po) => {
    const ordered = purchaseOrderOrderedValueNgn(po);
    const paid = Number(po?.supplierPaidNgn) || 0;
    return s + Math.max(0, ordered - paid);
  }, 0);
  const activeSupplierIds = new Set(nonRejected.map((po) => String(po?.supplierID || '').trim()).filter(Boolean));
  const activeSuppliers = activeSupplierIds.size;

  const lowStockItemsCount = products.filter((p) => Number(p?.stockLevel) < 1).length;
  const stockOutIncidents = products.filter((p) => Number(p?.stockLevel) <= 0).length;
  const inventoryValueNgn = products.reduce((s, p) => {
    const qty = Number(p?.stockLevel) || 0;
    const unitCost = Number(p?.unitCost ?? p?.costPriceNgn ?? 0) || 0;
    return s + qty * unitCost;
  }, 0);

  const goodsInTransitCount = inTransitLoads.filter((r) =>
    ['in_transit', 'loading_confirmed', 'on_loading'].includes(String(r?.status || '').toLowerCase())
  ).length;

  const prsRaisedToday = nonRejected.filter((po) => String(po?.orderDateISO || '').slice(0, 10) === today).length;
  const posCreatedToday = prsRaisedToday;
  const posAwaitingApproval = pendingPoCount;
  const posDelivered = nonRejected.filter((po) => ['received', 'closed'].includes(normalizePoStatus(po?.status))).length;
  const cancelledOrders = pos.filter((po) => ['cancelled', 'rejected'].includes(normalizePoStatus(po?.status))).length;

  const trendMap = new Map();
  nonRejected.forEach((po) => {
    const d = asDate(po?.orderDateISO);
    if (!d) return;
    const key = monthKey(d);
    trendMap.set(key, (trendMap.get(key) || 0) + purchaseOrderOrderedValueNgn(po));
  });
  const spendTrend = [...trendMap.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const categoryMap = new Map();
  nonRejected.forEach((po) => {
    const kind = procurementKindFromPo(po) || 'other';
    categoryMap.set(kind, (categoryMap.get(kind) || 0) + purchaseOrderOrderedValueNgn(po));
  });
  const categorySpend = [...categoryMap.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);

  const itemMap = new Map();
  nonRejected.forEach((po) => {
    const poKind = procurementKindFromPo(po);
    const lines = Array.isArray(po?.lines) ? po.lines : [];
    lines.forEach((line) => {
      const gauge = String(line?.gauge || '').trim();
      const color = String(line?.color || line?.colour || '').trim();
      const itemKey = `${poKind}:${color || '—'}:${gauge || '—'}`;
      const prev = itemMap.get(itemKey) || { itemKey, spendNgn: 0, qty: 0, poKind, color, gauge };
      prev.spendNgn += (Number(line?.qtyOrdered) || 0) * (Number(line?.unitPriceNgn) || Number(line?.unitPricePerKgNgn) || 0);
      prev.qty += Number(line?.qtyOrdered) || 0;
      itemMap.set(itemKey, prev);
    });
  });
  const topItems = [...itemMap.values()].sort((a, b) => b.spendNgn - a.spendNgn).slice(0, 10);

  const supplierSpendMap = new Map();
  nonRejected.forEach((po) => {
    const id = String(po?.supplierID || '').trim();
    if (!id) return;
    supplierSpendMap.set(id, (supplierSpendMap.get(id) || 0) + purchaseOrderOrderedValueNgn(po));
  });
  const supplierSpend = [...supplierSpendMap.entries()]
    .map(([supplierID, spendNgn]) => {
      const s = suppliers.find((x) => String(x?.supplierID) === supplierID);
      return { supplierID, supplierName: s?.name || supplierID, spendNgn };
    })
    .sort((a, b) => b.spendNgn - a.spendNgn)
    .slice(0, 10);

  const aging = { '0_30': 0, '31_60': 0, '61_90': 0, over_90: 0 };
  const apRows = Array.isArray(accountsPayable) ? accountsPayable : [];
  apRows.forEach((r) => {
    const due = asDate(r?.dueDateISO || r?.dueDate || r?.invoiceDateISO);
    const outstanding = Math.max(0, (Number(r?.amountNgn) || 0) - (Number(r?.paidNgn) || 0));
    if (!(outstanding > 0) || !due) return;
    const days = Math.floor((now.getTime() - due.getTime()) / DAY_MS);
    if (days <= 30) aging['0_30'] += outstanding;
    else if (days <= 60) aging['31_60'] += outstanding;
    else if (days <= 90) aging['61_90'] += outstanding;
    else aging.over_90 += outstanding;
  });

  const poStatusFlow = [
    'requested',
    'approved',
    'ordered',
    'dispatched',
    'received',
    'closed',
    'cancelled',
    'rejected',
  ].map((key) => ({
    key,
    count: pos.filter((po) => normalizePoStatus(po?.status) === key).length,
  }));

  return {
    kpis: {
      totalPurchasesMonthNgn,
      totalPurchasesYearNgn,
      pendingPoCount,
      approvedPoCount,
      outstandingSupplierPaymentsNgn,
      activeSuppliers,
      inventoryValueNgn,
      lowStockItemsCount,
      stockOutIncidents,
      goodsInTransitCount,
      prsRaisedToday,
      posCreatedToday,
      posAwaitingApproval,
      posDelivered,
      cancelledOrders,
    },
    charts: {
      spendTrend,
      categorySpend,
      topItems,
      supplierSpend,
      payablesAging: aging,
      poStatusFlow,
    },
  };
}

