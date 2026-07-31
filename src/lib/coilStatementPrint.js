import { fmtConv2 } from './conversionKgPerM.js';
import { resolveCoilJobKgUsed } from './coilProfileJobRows.js';

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtKg(v, digits = 1) {
  const n = asNum(v);
  if (n == null) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function fmtDate(iso) {
  const raw = String(iso || '').trim();
  if (!raw) return '—';
  const d = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return raw;
  return new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(iso) {
  const raw = String(iso || '').trim();
  if (!raw) return '—';
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return raw;
  return new Date(t).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

export function coilStatementMovementTitle(m) {
  const t = String(m?.type || '').toUpperCase();
  const detail = String(m?.detail || '').toLowerCase();
  if (detail.includes('roll finished')) return 'Roll finished';
  if (t.includes('SCRAP')) return 'Scrap posted';
  if (t.includes('RETURN')) return 'Material returned';
  if (t.includes('SPLIT')) return 'Coil split';
  if (t.includes('CONSUMED') || t.includes('PRODUCTION')) return 'Production consumed';
  if (t.includes('RECEIPT') || t.includes('GRN')) return 'Store receipt';
  return m?.type || 'Movement';
}

/**
 * Build a printable coil statement payload from coil profile data.
 * @param {{
 *   coil: object;
 *   balances: {
 *     receivedKg: number;
 *     kgUsed: number;
 *     productionUsedKg: number;
 *     incidentScrapKg: number;
 *     onHandKg: number;
 *     reservedKg: number;
 *     freeKg: number;
 *   };
 *   jobRows?: object[];
 *   conversionChecks?: object[];
 *   movements?: object[];
 *   productionTotals?: { jobsConsumedKgSum?: number; gapKg?: number | null } | null;
 *   purchaseConversion?: number | null;
 *   avgActualConversion?: number | null;
 *   avgStandardConversion?: number | null;
 * }} input
 */
export function buildCoilStatementPayload({
  coil,
  balances,
  jobRows = [],
  conversionChecks = [],
  movements = [],
  productionTotals = null,
  purchaseConversion = null,
  avgActualConversion = null,
  avgStandardConversion = null,
}) {
  if (!coil) return null;

  const productionRows = (jobRows || []).map((row) => {
    const opening = asNum(row.openingWeightKg ?? row.opening_weight_kg);
    const closing = asNum(row.closingWeightKg ?? row.closing_weight_kg);
    const kgUsed = resolveCoilJobKgUsed(row);
    const meters = asNum(row.meters ?? row.metersProduced ?? row.meters_produced) ?? 0;
    const allocatedAt = row.allocatedAtISO || row.allocated_at_iso || row.atISO || '';
    return {
      date: fmtDate(allocatedAt),
      cuttingListId: String(row.cuttingListId || row.cutting_list_id || '').trim() || '—',
      jobID: String(row.jobID || row.job_id || '').trim() || '—',
      quotationRef: String(row.quotationRef || row.quotation_ref || '').trim() || '—',
      customer: String(row.customer || '').trim() || '—',
      jobStatus: String(row.jobStatus || row.status || '').trim() || '—',
      openingKg: opening,
      closingKg: closing,
      kgUsed,
      meters: meters > 0 ? meters : null,
      conversion: fmtConv2(row.actualConv ?? row.actualConversionKgPerM),
      alertState: String(row.alertState || row.conversionAlertState || '').trim() || '—',
      allocationStatus: String(row.allocationStatus || row.allocation_status || '').trim() || '—',
    };
  });

  const conversionRows = (conversionChecks || []).map((c) => ({
    date: fmtDateTime(c.atISO || c.createdAtISO),
    ref: String(c.cuttingListId || c.jobID || '').trim() || '—',
    actual: fmtConv2(c.actualConversionKgPerM),
    standard: fmtConv2(c.standardConversionKgPerM),
    purchase: fmtConv2(c.supplierConversionKgPerM),
    alertState: String(c.alertState || '').trim() || 'Within band',
  }));

  const movementPrintRows = (movements || []).slice(0, 80).map((m) => ({
    date: fmtDateTime(m.atISO || m.createdAtISO),
    title: coilStatementMovementTitle(m),
    detail: String(m.detail || '').trim() || '—',
    ref: String(m.ref || '').trim() || '—',
    deltaKg: asNum(m.qtyDelta ?? m.kgDelta ?? m.deltaKg),
  }));

  const jobsConsumed = asNum(productionTotals?.jobsConsumedKgSum);
  const gapKg = asNum(productionTotals?.gapKg);

  return {
    coilNo: String(coil.coilNo || '').trim(),
    productID: String(coil.productID || '').trim() || '—',
    colour: String(coil.colour || '').trim() || '—',
    gaugeLabel: String(coil.gaugeLabel || coil.gauge || '').trim() || '—',
    materialTypeName: String(coil.materialTypeName || coil.materialType || coil.productID || '').trim() || '—',
    supplierName: String(coil.supplierName || coil.supplierID || '').trim() || '—',
    poID: String(coil.poID || '').trim() || '—',
    status: String(coil.currentStatus || '').trim() || '—',
    location: String(coil.location || '').trim() || '—',
    parentCoilNo: String(coil.parentCoilNo || '').trim() || '—',
    stockForm: String(coil.stockForm || '').trim() || '—',
    receivedAt: fmtDate(coil.receivedAtISO),
    supplierExpectedMeters: asNum(coil.supplierExpectedMeters),
    supplierConversionKgPerM: fmtConv2(coil.supplierConversionKgPerM ?? purchaseConversion),
    materialOriginNote: String(coil.materialOriginNote || '').trim() || '',
    balances: {
      receivedKg: balances?.receivedKg ?? 0,
      kgUsed: balances?.kgUsed ?? 0,
      productionUsedKg: balances?.productionUsedKg ?? 0,
      incidentScrapKg: balances?.incidentScrapKg ?? 0,
      onHandKg: balances?.onHandKg ?? 0,
      reservedKg: balances?.reservedKg ?? 0,
      freeKg: balances?.freeKg ?? 0,
    },
    conversionSummary: {
      purchase: fmtConv2(purchaseConversion ?? coil.supplierConversionKgPerM),
      averageActual: fmtConv2(avgActualConversion),
      averageStandard: fmtConv2(avgStandardConversion),
    },
    productionRows,
    conversionRows,
    movementRows: movementPrintRows,
    totals: {
      jobsConsumedKgSum: jobsConsumed,
      gapKg,
      productionLineCount: productionRows.length,
      totalMeters: productionRows.reduce((s, r) => s + (r.meters || 0), 0),
      totalKgUsedOnJobs: productionRows.reduce((s, r) => s + (r.kgUsed || 0), 0),
    },
    balanceLabels: {
      received: fmtKg(balances?.receivedKg, 1),
      used: fmtKg(balances?.kgUsed, 1),
      productionUsed: fmtKg(balances?.productionUsedKg, 1),
      incidentScrap: fmtKg(balances?.incidentScrapKg, 1),
      onHand: fmtKg(balances?.onHandKg, 1),
      reserved: fmtKg(balances?.reservedKg, 1),
      free: fmtKg(balances?.freeKg, 1),
    },
  };
}
