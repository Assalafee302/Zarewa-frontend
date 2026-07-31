/**
 * Shared coil/stock request status helpers (FE).
 */

/** One-line buy path used on Store / BM / Workspace. */
export const STORE_STOCK_BUY_PATH = 'Store raises → BM approves → MD/Procurement buys';

export function coilRequestIsPending(status) {
  return (
    String(status || '')
      .trim()
      .toLowerCase() === 'pending'
  );
}

/** Buy-ready after BM approve. Legacy `acknowledged` counts as approved. */
export function coilRequestIsApproved(status) {
  const s = String(status || '')
    .trim()
    .toLowerCase();
  return s === 'approved' || s === 'acknowledged';
}

export function coilRequestStatusLabel(status) {
  if (coilRequestIsPending(status)) return 'Awaiting BM';
  if (coilRequestIsApproved(status)) return 'Approved (buy-ready)';
  const s = String(status || '')
    .trim()
    .toLowerCase();
  if (s === 'rejected' || s === 'cancelled') return s === 'rejected' ? 'Rejected' : 'Cancelled';
  return String(status || '—');
}

/** Prefer persisted `unit`; fall back to stone material / family inference. */
export function coilRequestQtyUnit(row) {
  if (!row || typeof row !== 'object') return 'kg';
  const persisted = String(row.unit || '')
    .trim()
    .toLowerCase();
  if (persisted === 'm' || persisted === 'kg') return persisted;
  if (row.family === 'stone') return 'm';
  const mt = String(row.materialType || '').toLowerCase();
  if (mt.includes('stone')) return 'm';
  return 'kg';
}

export function formatCoilRequestQty(qty, unit = 'kg') {
  const n = Number(qty);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString()} ${unit === 'm' ? 'm' : 'kg'}`;
}
