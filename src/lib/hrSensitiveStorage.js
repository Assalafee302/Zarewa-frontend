const STORAGE_KEY = 'zarewa_hr_sensitive_unlock';

/**
 * @returns {{ token: string; expiresAtIso: string } | null}
 */
export function readHrSensitiveUnlock() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expiresAtIso) return null;
    if (Date.parse(parsed.expiresAtIso) < Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { token: String(parsed.token), expiresAtIso: String(parsed.expiresAtIso) };
  } catch {
    return null;
  }
}

/**
 * @param {{ token: string; expiresAtIso: string }} payload
 */
export function writeHrSensitiveUnlock(payload) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearHrSensitiveUnlock() {
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Headers for sensitive HR API calls. */
export function hrSensitiveHeaders() {
  const unlock = readHrSensitiveUnlock();
  if (!unlock?.token) return {};
  return { 'x-hr-sensitive-token': unlock.token };
}
