/** Same-person refund warnings — "Acknowledge with note" (owner decision 2026-10-19). Server enforces the same rules. */
export const DUAL_CONTROL_ACK_NOTE_MIN_LEN = 10;

/** MD / CEO only. */
export function userMayAcknowledgeDualControlClient(user) {
  const rk = String(user?.roleKey || '').trim().toLowerCase();
  return rk === 'md' || rk === 'ceo';
}
