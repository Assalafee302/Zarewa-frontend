/**
 * HQ roles can roll up every branch — ask which workspace to load before shell bootstrap.
 */

const STORAGE_PREFIX = 'zarewa.hqBranchConfirmed.v1:';

/** @param {unknown} roleKey */
export function roleNeedsHqBranchConfirm(roleKey) {
  const role = String(roleKey || '')
    .trim()
    .toLowerCase();
  return role === 'admin' || role === 'md' || role === 'ceo' || role === 'chairman';
}

/** @param {unknown} userId */
function storageKey(userId) {
  const uid = String(userId || '').trim();
  return uid ? `${STORAGE_PREFIX}${uid}` : '';
}

/** @param {unknown} userId */
export function isHqBranchConfirmed(userId) {
  const key = storageKey(userId);
  if (!key || typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/** @param {unknown} userId */
export function markHqBranchConfirmed(userId) {
  const key = storageKey(userId);
  if (!key || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

/** @param {unknown} userId */
export function clearHqBranchConfirmed(userId) {
  const key = storageKey(userId);
  if (!key || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
