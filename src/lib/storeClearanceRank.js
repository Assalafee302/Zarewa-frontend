/**
 * Rank store desk clearance items for Clear now (Operations).
 * Spec-first language; production register stages rank highest.
 */

const SEVERITY_RANK = { critical: 0, high: 1, warn: 2, info: 3 };

/**
 * @param {object} params
 * @param {Array<{ id: string, customer?: string, label?: string, reason?: string, severity?: string }>} params.pendingProductions
 * @param {number} [params.receiveCount]
 * @param {number} [params.podPendingCount]
 * @param {number} [params.pendingMexCount]
 * @param {number} [params.thinCoilCount]
 * @param {number} [params.maxRows]
 */
export function buildStoreClearanceRows({
  pendingProductions = [],
  receiveCount = 0,
  podPendingCount = 0,
  pendingMexCount = 0,
  thinCoilCount = 0,
  idleRows = [],
  restockRows = [],
  maxRows = 10,
} = {}) {
  const rows = [];

  for (const p of pendingProductions || []) {
    const reason = String(p.reason || '');
    const lower = reason.toLowerCase();
    let kind = 'register';
    let title = 'Register production';
    let cta = 'Open register';
    let score = 100;

    // Need-coil blocks the floor — rank above awaiting registration.
    if (lower.includes('coil') || p.severity === 'critical') {
      kind = 'need_coil';
      title = 'Need coil';
      cta = 'Allocate';
      score = 108;
    } else if (lower.includes('manager') || lower.includes('review')) {
      kind = 'mgr_review';
      title = 'Awaiting BM review';
      cta = 'Open register';
      score = 55;
    } else if (lower.includes('due') || lower.includes('overdue')) {
      kind = 'overdue';
      title = 'Overdue on register';
      cta = 'Open register';
      score = 80;
    } else if (lower.includes('registration') || lower.includes('register')) {
      kind = 'register';
      title = 'Register production';
      cta = 'Open register';
      score = 100;
    }

    rows.push({
      id: `prod-${p.id}-${kind}`,
      kind,
      title,
      detail: [p.customer, p.label].filter(Boolean).join(' · ') || reason,
      meta: reason,
      refId: p.id,
      severity: p.severity || (kind === 'need_coil' ? 'critical' : 'high'),
      score,
      cta,
      action: 'register',
      filter: kind === 'need_coil' ? 'no_coil' : undefined,
    });
  }

  if (podPendingCount > 0) {
    rows.push({
      id: 'pod-pending',
      kind: 'pod',
      title: 'Confirm POD',
      detail: `${podPendingCount} delivery(ies) awaiting proof of delivery`,
      meta: '',
      refId: '',
      severity: podPendingCount >= 3 ? 'critical' : 'high',
      score: 90,
      cta: 'Confirm',
      action: 'pod',
      count: podPendingCount,
    });
  }

  if (receiveCount > 0) {
    rows.push({
      id: 'receive-pending',
      kind: 'receive',
      title: 'Receive goods',
      detail: `${receiveCount} PO(s) on road / ready to GRN`,
      meta: '',
      refId: '',
      severity: receiveCount >= 3 ? 'high' : 'warn',
      score: 85,
      cta: 'Receive',
      action: 'receive',
      count: receiveCount,
    });
  }

  if (pendingMexCount > 0) {
    rows.push({
      id: 'mex-pending',
      kind: 'exceptions',
      title: 'Exceptions pending',
      detail: `${pendingMexCount} submitted incident(s) in queue`,
      meta: '',
      refId: '',
      severity: 'warn',
      score: 70,
      cta: 'Open exceptions',
      action: 'exceptions',
      count: pendingMexCount,
    });
  }

  if (thinCoilCount > 0) {
    rows.push({
      id: 'thin-coils',
      kind: 'thin',
      title: 'Thin coils',
      detail: `${thinCoilCount} coil(s) under 85 kg — finish roll when ready`,
      meta: '',
      refId: '',
      severity: 'info',
      score: 40,
      cta: 'Open on hand',
      action: 'onhand_coil',
      count: thinCoilCount,
    });
  }

  for (const idle of idleRows || []) {
    rows.push(idle);
  }

  for (const restock of restockRows || []) {
    rows.push(restock);
  }

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
  });

  // Keep restock/idle visible even when production fills the list.
  const cap = Math.max(1, maxRows);
  const mustKeep = rows.filter((r) => r.kind === 'idle' || r.kind === 'restock');
  const others = rows.filter((r) => r.kind !== 'idle' && r.kind !== 'restock');
  const room = Math.max(0, cap - mustKeep.length);
  const merged = [...others.slice(0, room), ...mustKeep];
  merged.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
  });
  return merged.slice(0, cap);
}

/**
 * Pulse chip counts for Clear now.
 */
export function buildStorePulseCounts({
  pendingProductions = [],
  receiveCount = 0,
  podPendingCount = 0,
  pendingMexCount = 0,
  noCoilCount = 0,
} = {}) {
  let toRegister = 0;
  for (const p of pendingProductions || []) {
    const lower = String(p.reason || '').toLowerCase();
    // Need-coil jobs are counted on the Need coil chip — don't double-count as Register.
    if (lower.includes('coil') || p.severity === 'critical') continue;
    toRegister += 1;
  }
  return {
    register: toRegister,
    needCoil: Number(noCoilCount) || 0,
    pod: Number(podPendingCount) || 0,
    receive: Number(receiveCount) || 0,
    exceptions: Number(pendingMexCount) || 0,
  };
}

/**
 * Normalize focusOpsTab aliases → canonical tab id.
 * @param {string} raw
 * @returns {{ tab: string, deliveriesFocus?: boolean, notice?: string } | null}
 */
export function normalizeOpsFocusTab(raw) {
  const t = String(raw || '')
    .trim()
    .toLowerCase();
  if (!t) return null;
  if (t === 'overview' || t === 'clear' || t === 'today' || t === 'clearnow') {
    return { tab: 'overview' };
  }
  if (t === 'inventory' || t === 'onhand' || t === 'stock' || t === 'on_hand') {
    return { tab: 'inventory' };
  }
  if (t === 'production' || t === 'register') {
    return { tab: 'production' };
  }
  if (t === 'materialexceptions' || t === 'exceptions' || t === 'mex') {
    return { tab: 'materialExceptions' };
  }
  if (t === 'overtime' || t === 'ot' || t === 'otpay' || t === 'overtime_pay') {
    return { tab: 'overtime' };
  }
  if (t === 'coilcontrol') {
    return { tab: 'materialExceptions', notice: 'Coil control is under Exceptions.' };
  }
  if (t === 'deliveries' || t === 'pod') {
    return { tab: 'overview', deliveriesFocus: true };
  }
  if (t === 'maintenance') {
    return { tab: 'production', notice: 'Maintenance shortcuts open the Register.' };
  }
  return null;
}
