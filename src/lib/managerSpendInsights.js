/**
 * Branch Manager Spend tab — client-side aggregation from payment requests (+ orphan expenses).
 * Maintenance category totals stay on PR/expense; machine attribution is a separate insights feed.
 */

import {
  MOM_SPIKE_ABS_FLOOR_NGN,
  MOM_SPIKE_PCT_THRESHOLD,
  momSpikeSignals as sharedMomSpikeSignals,
} from './momSpikeSignals.js';

export const SPEND_MOM_PCT_THRESHOLD = MOM_SPIKE_PCT_THRESHOLD;
/** Absolute floor so tiny MoM % swings do not raise signals. */
export const SPEND_MOM_ABS_FLOOR_NGN = MOM_SPIKE_ABS_FLOOR_NGN;
/** Recurring payee signal: same payee appears this many times in the period. */
export const SPEND_RECURRING_PAYEE_MIN_COUNT = 3;
export const SPEND_TOP_DRIVERS = 5;

/**
 * @param {string | Date | null | undefined} d
 * @returns {string} YYYY-MM
 */
export function monthKeyFromDate(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(String(d || ''));
  if (Number.isNaN(dt.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {string} monthKey YYYY-MM
 * @returns {{ startIso: string, endIso: string }}
 */
export function monthBounds(monthKey) {
  const m = String(monthKey || '').trim();
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) {
    const k = monthKeyFromDate();
    return monthBounds(k);
  }
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const startIso = `${match[1]}-${match[2]}-01`;
  const lastDay = new Date(y, mo, 0).getDate();
  const endIso = `${match[1]}-${match[2]}-${String(lastDay).padStart(2, '0')}`;
  return { startIso, endIso };
}

/**
 * @param {string} monthKey YYYY-MM
 * @returns {string}
 */
export function priorMonthKey(monthKey) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || '').trim());
  if (!match) return monthKeyFromDate();
  let y = Number(match[1]);
  let mo = Number(match[2]) - 1;
  if (mo < 1) {
    mo = 12;
    y -= 1;
  }
  return `${y}-${String(mo).padStart(2, '0')}`;
}

/**
 * @param {unknown} status
 * @returns {'pending' | 'approved_awaiting' | 'paid' | 'partial' | 'rejected' | 'other'}
 */
export function classifyPaymentRequestStatus(pr) {
  const st = String(pr?.approvalStatus || '').trim().toLowerCase();
  if (st === 'rejected' || st === 'cancelled') return 'rejected';
  const requested = Math.round(Number(pr?.amountRequestedNgn) || 0);
  const paid = Math.round(Number(pr?.paidAmountNgn) || 0);
  if (st === 'approved' || st === 'paid') {
    if (requested > 0 && paid >= requested) return 'paid';
    if (paid > 0) return 'partial';
    return 'approved_awaiting';
  }
  if (paid > 0 && paid >= requested && requested > 0) return 'paid';
  if (paid > 0) return 'partial';
  return 'pending';
}

/**
 * Exposure amount for a payment request under current filter mode.
 * Default (committed): full requested amount for non-rejected rows.
 * Paid-only: cash that left the account.
 * @param {object} pr
 * @param {{ paidOnly?: boolean }} opts
 */
export function paymentRequestExposureNgn(pr, opts = {}) {
  const status = classifyPaymentRequestStatus(pr);
  if (status === 'rejected') return 0;
  const requested = Math.round(Number(pr?.amountRequestedNgn) || 0);
  const paid = Math.round(Number(pr?.paidAmountNgn) || 0);
  if (opts.paidOnly) return Math.max(0, paid);
  return Math.max(0, requested || paid);
}

/**
 * Normalize payment requests + orphan expenses into spend rows.
 * Categories pass through as stored (including Maintenance → GL 5020 in Finance).
 *
 * @param {{ paymentRequests?: object[], expenses?: object[] }} snapshot
 * @param {{
 *   monthKey?: string,
 *   branchId?: string | null,
 *   category?: string | null,
 *   paidOnly?: boolean,
 * }} filters
 */
export function buildSpendRows(snapshot, filters = {}) {
  const monthKey = filters.monthKey || monthKeyFromDate();
  const { startIso, endIso } = monthBounds(monthKey);
  const branchFilter = String(filters.branchId || '').trim();
  const categoryFilter = String(filters.category || '').trim();
  const paidOnly = Boolean(filters.paidOnly);

  const prs = Array.isArray(snapshot?.paymentRequests) ? snapshot.paymentRequests : [];
  const expenses = Array.isArray(snapshot?.expenses) ? snapshot.expenses : [];

  /** @type {Map<string, true>} */
  const expenseIdsCovered = new Map();
  /** @type {object[]} */
  const rows = [];

  for (const pr of prs) {
    const status = classifyPaymentRequestStatus(pr);
    if (status === 'rejected') continue;

    const dateIso = String(pr.requestDate || pr.approvedAtISO || pr.paidAtISO || '').slice(0, 10);
    if (!dateIso || dateIso < startIso || dateIso > endIso) continue;

    const branchId = String(pr.branchId || '').trim();
    if (branchFilter && branchId && branchId !== branchFilter) continue;
    if (branchFilter && !branchId) continue;

    const category = String(pr.expenseCategory || pr.category || '').trim() || 'Uncategorized';
    if (categoryFilter && category !== categoryFilter) continue;

    const amountNgn = paymentRequestExposureNgn(pr, { paidOnly });
    if (paidOnly && amountNgn <= 0) continue;
    if (!paidOnly && amountNgn <= 0) continue;

    const expenseId = String(pr.expenseID || pr.expenseId || '').trim();
    if (expenseId) expenseIdsCovered.set(expenseId, true);

    rows.push({
      id: String(pr.requestID || pr.requestId || '').trim() || `pr-${rows.length}`,
      source: 'payment_request',
      dateIso,
      category,
      amountNgn,
      paidNgn: Math.round(Number(pr.paidAmountNgn) || 0),
      status,
      payee: String(pr.payeeName || '').trim() || '—',
      description: String(pr.description || '').trim() || '—',
      branchId,
      requestId: String(pr.requestID || pr.requestId || '').trim(),
      expenseId,
      reference: String(pr.requestReference || pr.reference || '').trim(),
    });
  }

  // Orphan paid expenses (no linked PR in snapshot) — keeps historical cash in view.
  for (const ex of expenses) {
    const expenseId = String(ex.expenseID || ex.expenseId || '').trim();
    if (expenseId && expenseIdsCovered.has(expenseId)) continue;

    const dateIso = String(ex.date || '').slice(0, 10);
    if (!dateIso || dateIso < startIso || dateIso > endIso) continue;

    const branchId = String(ex.branchId || ex.branch_id || '').trim();
    if (branchFilter && branchId && branchId !== branchFilter) continue;
    if (branchFilter && !branchId) continue;

    const category = String(ex.category || ex.expenseType || '').trim() || 'Uncategorized';
    if (categoryFilter && category !== categoryFilter) continue;

    const amountNgn = Math.round(Number(ex.amountNgn) || 0);
    if (amountNgn <= 0) continue;
    // Orphans are treated as paid cash; always include (even when not paidOnly).
    rows.push({
      id: expenseId || `ex-${rows.length}`,
      source: 'expense',
      dateIso,
      category,
      amountNgn,
      paidNgn: amountNgn,
      status: 'paid',
      payee: String(ex.payeeName || ex.vendor || '').trim() || '—',
      description: String(ex.description || ex.expenseType || ex.reference || '').trim() || '—',
      branchId,
      requestId: '',
      expenseId,
      reference: String(ex.reference || '').trim(),
    });
  }

  rows.sort((a, b) => String(b.dateIso).localeCompare(String(a.dateIso)) || b.amountNgn - a.amountNgn);
  return rows;
}

/**
 * @param {object[]} rows
 * @returns {{ category: string, amountNgn: number, count: number, pct: number }[]}
 */
export function rankCategories(rows) {
  const map = new Map();
  let total = 0;
  for (const r of rows) {
    const cat = r.category || 'Uncategorized';
    const prev = map.get(cat) || { category: cat, amountNgn: 0, count: 0 };
    prev.amountNgn += r.amountNgn;
    prev.count += 1;
    map.set(cat, prev);
    total += r.amountNgn;
  }
  return [...map.values()]
    .map((r) => ({
      ...r,
      amountNgn: Math.round(r.amountNgn),
      pct: total > 0 ? Math.round((r.amountNgn / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amountNgn - a.amountNgn);
}

/**
 * @param {object[]} rows
 * @returns {{ branchId: string, amountNgn: number, count: number }[]}
 */
export function rankBranches(rows) {
  const map = new Map();
  for (const r of rows) {
    const id = r.branchId || '—';
    const prev = map.get(id) || { branchId: id, amountNgn: 0, count: 0 };
    prev.amountNgn += r.amountNgn;
    prev.count += 1;
    map.set(id, prev);
  }
  return [...map.values()]
    .map((r) => ({ ...r, amountNgn: Math.round(r.amountNgn) }))
    .sort((a, b) => b.amountNgn - a.amountNgn);
}

/**
 * Weekly buckets within a month (by ISO week label W1… from month start).
 * @param {object[]} rows
 * @param {string} monthKey
 */
export function weeklyTrend(rows, monthKey) {
  const { startIso } = monthBounds(monthKey);
  const start = new Date(`${startIso}T12:00:00`);
  const buckets = new Map();
  for (const r of rows) {
    const d = new Date(`${r.dateIso}T12:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    const dayOffset = Math.max(0, Math.floor((d.getTime() - start.getTime()) / 86400000));
    const weekIdx = Math.floor(dayOffset / 7) + 1;
    const key = `W${weekIdx}`;
    buckets.set(key, (buckets.get(key) || 0) + r.amountNgn);
  }
  return [...buckets.entries()]
    .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
    .map(([name, v]) => ({ name, v: Math.round(v) }));
}

/**
 * @param {object[]} currentRows
 * @param {object[]} priorRows
 */
export function categoryMomDeltas(currentRows, priorRows) {
  const cur = rankCategories(currentRows);
  const priorMap = new Map(rankCategories(priorRows).map((r) => [r.category, r.amountNgn]));
  return cur.map((r) => {
    const prior = priorMap.get(r.category) || 0;
    const deltaNgn = r.amountNgn - prior;
    const deltaPct = prior > 0 ? Math.round((deltaNgn / prior) * 1000) / 10 : r.amountNgn > 0 ? 100 : 0;
    return {
      category: r.category,
      amountNgn: r.amountNgn,
      priorNgn: prior,
      deltaNgn,
      deltaPct,
      count: r.count,
      pct: r.pct,
    };
  });
}

/**
 * MoM % spikes — shared util (25% + abs floor + prior-period floor).
 * @param {{ category: string, amountNgn: number, priorNgn?: number, deltaPct: number, deltaNgn: number }[]} deltas
 * @param {{ pctThreshold?: number, absFloorNgn?: number }} opts
 */
export function momSpikeSignals(deltas, opts = {}) {
  return sharedMomSpikeSignals(deltas, {
    pctThreshold: opts.pctThreshold ?? SPEND_MOM_PCT_THRESHOLD,
    absFloorNgn: opts.absFloorNgn ?? SPEND_MOM_ABS_FLOOR_NGN,
  });
}

/**
 * @param {object[]} rows
 * @param {{ minCount?: number }} opts
 */
export function recurringPayeeSignals(rows, opts = {}) {
  const minCount = opts.minCount ?? SPEND_RECURRING_PAYEE_MIN_COUNT;
  const map = new Map();
  for (const r of rows) {
    const payee = String(r.payee || '').trim();
    if (!payee || payee === '—') continue;
    const key = payee.toLowerCase();
    const prev = map.get(key) || { payee, count: 0, amountNgn: 0 };
    prev.count += 1;
    prev.amountNgn += r.amountNgn;
    map.set(key, prev);
  }
  return [...map.values()]
    .filter((p) => p.count >= minCount)
    .sort((a, b) => b.amountNgn - a.amountNgn)
    .map((p) => ({
      id: `payee-${p.payee}`,
      kind: 'recurring_payee',
      severity: 'medium',
      title: `${p.payee} appears ${p.count} times`,
      detail: `Total ₦${Math.round(p.amountNgn).toLocaleString('en-NG')} this period — compare rates or consolidate.`,
      payee: p.payee,
      amountNgn: Math.round(p.amountNgn),
      count: p.count,
    }));
}

/**
 * Full insights pack for the Spend tab.
 *
 * @param {{ paymentRequests?: object[], expenses?: object[], branches?: object[] }} snapshot
 * @param {{
 *   monthKey?: string,
 *   branchId?: string | null,
 *   category?: string | null,
 *   paidOnly?: boolean,
 * }} filters
 */
export function buildManagerSpendInsights(snapshot, filters = {}) {
  const monthKey = filters.monthKey || monthKeyFromDate();
  const priorKey = priorMonthKey(monthKey);
  const currentRows = buildSpendRows(snapshot, { ...filters, monthKey });
  const priorRows = buildSpendRows(snapshot, { ...filters, monthKey: priorKey });

  const totalNgn = currentRows.reduce((s, r) => s + r.amountNgn, 0);
  const priorTotalNgn = priorRows.reduce((s, r) => s + r.amountNgn, 0);
  const vsPriorPct =
    priorTotalNgn > 0 ? Math.round(((totalNgn - priorTotalNgn) / priorTotalNgn) * 1000) / 10 : totalNgn > 0 ? 100 : 0;

  const paidNgn = currentRows.reduce((s, r) => s + (Number(r.paidNgn) || 0), 0);
  const pendingCount = currentRows.filter((r) => r.status === 'pending' || r.status === 'approved_awaiting' || r.status === 'partial').length;

  const categoryRank = categoryMomDeltas(currentRows, priorRows);
  const branchRank = rankBranches(currentRows);
  const drivers = categoryRank.slice(0, SPEND_TOP_DRIVERS);
  const trend = weeklyTrend(currentRows, monthKey);
  const categoryBars = categoryRank.slice(0, 8).map((c) => ({ name: c.category, v: c.amountNgn }));

  const signals = [
    ...momSpikeSignals(categoryRank),
    ...recurringPayeeSignals(currentRows),
  ];

  const topCategory = categoryRank[0] || null;

  return {
    monthKey,
    priorMonthKey: priorKey,
    rows: currentRows,
    totalNgn: Math.round(totalNgn),
    priorTotalNgn: Math.round(priorTotalNgn),
    vsPriorPct,
    paidNgn: Math.round(paidNgn),
    pendingCount,
    topCategory,
    drivers,
    categoryRank,
    branchRank,
    trend,
    categoryBars,
    signals,
  };
}
