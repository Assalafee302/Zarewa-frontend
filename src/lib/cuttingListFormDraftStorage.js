const STORAGE_PREFIX = 'zarewa.cuttingListFormDraft.v1:';

function storageKey(branchId, quotationRef) {
  const bid = String(branchId || 'default').trim();
  const q = String(quotationRef || '__new__').trim();
  return `${STORAGE_PREFIX}${bid}:${q}`;
}

export function readCuttingListFormDraft(branchId, quotationRef) {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(storageKey(branchId, quotationRef));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCuttingListFormDraft(branchId, quotationRef, payload) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      storageKey(branchId, quotationRef),
      JSON.stringify({ ...payload, savedAtISO: new Date().toISOString() })
    );
  } catch {
    // quota / private mode
  }
}

export function clearCuttingListFormDraft(branchId, quotationRef) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(storageKey(branchId, quotationRef));
  } catch {
    // ignore
  }
}
