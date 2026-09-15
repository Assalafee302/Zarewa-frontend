/**
 * Approval / attention deep-links by role.
 * MD/CEO/Chairman use Command Centre Decide; branch managers use `/manager`.
 */

const EXEC_DECIDE = '/exec?tab=decide';

function normalizeRoleKey(roleKey) {
  return String(roleKey || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/** True when the user must not open the branch manager desk. */
export function roleUsesExecutiveApprovalDesk(roleKey) {
  const rk = normalizeRoleKey(roleKey);
  return rk === 'md' || rk === 'ceo' || rk === 'chairman';
}

/**
 * @param {string | null | undefined} roleKey
 * @param {string} [inbox] — manager inbox id (ignored for executive desk)
 */
export function approvalAttentionPathForRole(roleKey, inbox = 'attention') {
  if (roleUsesExecutiveApprovalDesk(roleKey)) return EXEC_DECIDE;
  const id = String(inbox || 'attention').trim() || 'attention';
  return `/manager?tab=approvals&inbox=${encodeURIComponent(id)}`;
}

/** Bare desk home for approvals (no inbox query). */
export function approvalDeskHomeForRole(roleKey) {
  if (roleUsesExecutiveApprovalDesk(roleKey)) return EXEC_DECIDE;
  return '/manager';
}
