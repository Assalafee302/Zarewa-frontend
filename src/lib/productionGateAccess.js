/** Parity with server/productionGateAccess.js */
export const PRODUCTION_GATE_OVERRIDE_NOTE_MIN_LEN = 8;

/**
 * Branch manager (`sales_manager`), MD, or admin — not sales officers.
 * @param {string | null | undefined} roleKey
 */
export function canApproveProductionGate(roleKey) {
  const rk = String(roleKey || '').toLowerCase();
  return rk === 'admin' || rk === 'md' || rk === 'sales_manager';
}

/**
 * @param {string} note
 */
export function productionGateOverrideNoteValid(note) {
  return String(note || '').trim().length >= PRODUCTION_GATE_OVERRIDE_NOTE_MIN_LEN;
}
