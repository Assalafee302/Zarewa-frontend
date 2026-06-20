/** Parity with shared/lib/productionGateAccess.js */
export const PRODUCTION_GATE_OVERRIDE_NOTE_MIN_LEN = 8;

function roleKey(roleKeyOrActor) {
  if (roleKeyOrActor && typeof roleKeyOrActor === 'object') {
    return String(roleKeyOrActor.roleKey || roleKeyOrActor.role || '').toLowerCase();
  }
  return String(roleKeyOrActor || '').toLowerCase();
}

export function quotationHasRecordedPayment(paidNgn) {
  return Math.round(Number(paidNgn) || 0) > 0;
}

export function productionGateApprovalLevelForActor(actorOrRoleKey) {
  if (typeof actorOrRoleKey === 'string') {
    const rk = roleKey(actorOrRoleKey);
    if (rk === 'admin') return 'admin';
    if (rk === 'md') return 'md';
    if (rk === 'sales_manager' || rk === 'branch_manager') return 'branch_manager';
    return null;
  }
  const actor = actorOrRoleKey;
  if (!actor) return null;
  const perms = Array.isArray(actor.permissions) ? actor.permissions : [];
  if (perms.includes('*')) return 'admin';
  const rk = roleKey(actor);
  if (rk === 'admin') return 'admin';
  if (rk === 'md') return 'md';
  if (rk === 'sales_manager' || rk === 'branch_manager') return 'branch_manager';
  return null;
}

/**
 * @param {string | { roleKey?: string; role?: string; permissions?: string[] }} actorOrRoleKey
 * @param {{ paidNgn?: number | null; totalNgn?: number | null } | number | null | undefined} [paidOrOpts]
 */
export function canApproveProductionGate(actorOrRoleKey, paidOrOpts = null) {
  const paidNgn =
    paidOrOpts != null && typeof paidOrOpts === 'object'
      ? paidOrOpts.paidNgn
      : paidOrOpts;
  const level =
    typeof actorOrRoleKey === 'string'
      ? productionGateApprovalLevelForActor(actorOrRoleKey)
      : productionGateApprovalLevelForActor(actorOrRoleKey);
  if (!level) return false;
  if (level === 'admin' || level === 'md') return true;
  if (level === 'branch_manager') return quotationHasRecordedPayment(paidNgn);
  return false;
}

export function productionGateOverrideNoteValid(note) {
  return String(note || '').trim().length >= PRODUCTION_GATE_OVERRIDE_NOTE_MIN_LEN;
}

export function productionGateOverrideEffective(q) {
  const stamped = Boolean(
    String(q?.manager_production_approved_at_iso || q?.managerProductionApprovedAtISO || '').trim()
  );
  if (!stamped) return false;
  const paid = Math.round(Number(q?.paid_ngn ?? q?.paidNgn) || 0);
  if (quotationHasRecordedPayment(paid)) return true;
  const level = String(
    q?.manager_production_approval_level || q?.managerProductionApprovalLevel || ''
  ).toLowerCase();
  return level === 'md' || level === 'admin';
}

export function productionGateOverrideDeniedMessage(paidNgn) {
  if (!quotationHasRecordedPayment(paidNgn)) {
    return 'Zero payment requires Managing Director approval before cutting list / production.';
  }
  return 'Production gate override requires Branch Manager or Managing Director approval.';
}
