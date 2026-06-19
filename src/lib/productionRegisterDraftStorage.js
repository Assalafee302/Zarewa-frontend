/** Session-backed drafts for production register forms (survives refresh / poll). */

const PROD_ACCESSORY_DRAFT_STORAGE_PREFIX = 'zarewa.prodAccessoryDraft.v1:';
const PROD_SF_DRAFT_STORAGE_PREFIX = 'zarewa.prodStoneFlatsheetDraft.v1:';
const PROD_COIL_DRAFT_STORAGE_PREFIX = 'zarewa.prodCoilDraft.v1:';
const PROD_METER_DRAFT_STORAGE_PREFIX = 'zarewa.prodMeterDraft.v1:';

function prodAccessoryDraftStorageKey(jobId) {
  return PROD_ACCESSORY_DRAFT_STORAGE_PREFIX + encodeURIComponent(String(jobId || ''));
}

export function readProdAccessoryDraftMap(jobId) {
  if (typeof sessionStorage === 'undefined' || !jobId) return {};
  try {
    const raw = sessionStorage.getItem(prodAccessoryDraftStorageKey(jobId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeProdAccessoryDraftEntry(jobId, stableKey, value) {
  if (typeof sessionStorage === 'undefined' || !jobId || !stableKey) return;
  try {
    const map = readProdAccessoryDraftMap(jobId);
    map[stableKey] = value;
    sessionStorage.setItem(prodAccessoryDraftStorageKey(jobId), JSON.stringify(map));
  } catch {
    // quota / private mode
  }
}

export function clearProdAccessoryDraftStorage(jobId) {
  if (typeof sessionStorage === 'undefined' || !jobId) return;
  try {
    sessionStorage.removeItem(prodAccessoryDraftStorageKey(jobId));
  } catch {
    // ignore
  }
}

function prodSfDraftStorageKey(jobId) {
  return PROD_SF_DRAFT_STORAGE_PREFIX + encodeURIComponent(String(jobId || ''));
}

export function readProdSfDraftMap(jobId) {
  if (typeof sessionStorage === 'undefined' || !jobId) return {};
  try {
    const raw = sessionStorage.getItem(prodSfDraftStorageKey(jobId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeProdSfDraftEntry(jobId, stableKey, patch) {
  if (typeof sessionStorage === 'undefined' || !jobId || !stableKey) return;
  try {
    const map = readProdSfDraftMap(jobId);
    const prev = map[stableKey] && typeof map[stableKey] === 'object' ? map[stableKey] : {};
    map[stableKey] = { ...prev, ...patch };
    sessionStorage.setItem(prodSfDraftStorageKey(jobId), JSON.stringify(map));
  } catch {
    // quota / private mode
  }
}

export function clearProdSfDraftStorage(jobId) {
  if (typeof sessionStorage === 'undefined' || !jobId) return;
  try {
    sessionStorage.removeItem(prodSfDraftStorageKey(jobId));
  } catch {
    // ignore
  }
}

function prodCoilDraftStorageKey(jobId) {
  return PROD_COIL_DRAFT_STORAGE_PREFIX + encodeURIComponent(String(jobId || ''));
}

export function readProdCoilDraftMap(jobId) {
  if (typeof sessionStorage === 'undefined' || !jobId) return {};
  try {
    const raw = sessionStorage.getItem(prodCoilDraftStorageKey(jobId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeProdCoilDraftRow(jobId, rowKey, patch) {
  if (typeof sessionStorage === 'undefined' || !jobId || !rowKey) return;
  try {
    const map = readProdCoilDraftMap(jobId);
    const prev = map[rowKey] && typeof map[rowKey] === 'object' ? map[rowKey] : {};
    map[rowKey] = { ...prev, ...patch };
    sessionStorage.setItem(prodCoilDraftStorageKey(jobId), JSON.stringify(map));
  } catch {
    // quota / private mode
  }
}

export function clearProdCoilDraftStorage(jobId) {
  if (typeof sessionStorage === 'undefined' || !jobId) return;
  try {
    sessionStorage.removeItem(prodCoilDraftStorageKey(jobId));
  } catch {
    // ignore
  }
}

function prodMeterDraftStorageKey(jobId) {
  return PROD_METER_DRAFT_STORAGE_PREFIX + encodeURIComponent(String(jobId || ''));
}

/** @returns {{ stoneMetersConsumed?: string, offcutMetersProduced?: string, offcutInventoryMetersInput?: string }} */
export function readProdMeterDraft(jobId) {
  if (typeof sessionStorage === 'undefined' || !jobId) return {};
  try {
    const raw = sessionStorage.getItem(prodMeterDraftStorageKey(jobId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeProdMeterDraft(jobId, patch) {
  if (typeof sessionStorage === 'undefined' || !jobId) return;
  try {
    const prev = readProdMeterDraft(jobId);
    sessionStorage.setItem(prodMeterDraftStorageKey(jobId), JSON.stringify({ ...prev, ...patch }));
  } catch {
    // quota / private mode
  }
}

export function clearProdMeterDraftStorage(jobId) {
  if (typeof sessionStorage === 'undefined' || !jobId) return;
  try {
    sessionStorage.removeItem(prodMeterDraftStorageKey(jobId));
  } catch {
    // ignore
  }
}

export function clearAllProductionRegisterDrafts(jobId) {
  clearProdAccessoryDraftStorage(jobId);
  clearProdSfDraftStorage(jobId);
  clearProdCoilDraftStorage(jobId);
  clearProdMeterDraftStorage(jobId);
}
