/** Shared chrome for BM/Ops/Finance roadmap polish. */

export const CSAT_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'OK',
  4: 'Good',
  5: 'Excellent',
};

export const BRANCH_LABELS = {
  'BR-KD': 'Kaduna (HQ)',
  'BR-YL': 'Yola',
  'BR-MDG': 'Maiduguri',
  ALL: 'All branches',
};

export function branchDisplayName(id, map) {
  const key = String(id || '').trim();
  if (!key) return '—';
  if (map?.get?.(key)) return map.get(key);
  if (map?.[key]) return map[key];
  return BRANCH_LABELS[key] || key;
}

export function relativeTime(iso, now = Date.now()) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const sec = Math.round((now - t) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleString();
}

export function formatDurationHm(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  return `${h}h ${String(r).padStart(2, '0')}m`;
}

/** OT band from worked − scheduled minutes. */
export function otDeltaBand(scheduled, worked) {
  const s = Number(scheduled);
  const w = Number(worked);
  if (!Number.isFinite(s) || !Number.isFinite(w) || s <= 0) return { delta: null, tone: 'neutral', className: 'text-slate-500' };
  const delta = Math.round(w - s);
  if (delta <= 15) return { delta, tone: 'ok', className: 'text-emerald-700' };
  if (delta <= 60) return { delta, tone: 'watch', className: 'text-amber-800 font-bold' };
  return { delta, tone: 'high', className: 'text-rose-800 font-bold' };
}

export function csatStarString(score) {
  const n = Math.max(0, Math.min(5, Math.round(Number(score) || 0)));
  return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
}

/** High-value delivery threshold (₦) — CSAT required at/above. */
export const CSAT_REQUIRED_ABOVE_NGN = 500_000;

export function deliveryNeedsCsat(delivery) {
  const total =
    Number(delivery?.totalNgn ?? delivery?.amountNgn ?? delivery?.invoiceTotalNgn ?? 0) || 0;
  return total >= CSAT_REQUIRED_ABOVE_NGN;
}
