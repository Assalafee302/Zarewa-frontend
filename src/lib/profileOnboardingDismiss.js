const STORAGE_KEY = 'zarewa.profile.onboarding.dismissedUntil';

function readMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

/** @param {string | undefined | null} userId */
export function isOnboardingWizardDismissed(userId) {
  const id = String(userId || '').trim();
  if (!id) return false;
  const until = readMap()[id];
  if (!until) return false;
  if (Date.parse(until) <= Date.now()) {
    const map = readMap();
    delete map[id];
    writeMap(map);
    return false;
  }
  return true;
}

/** @param {string | undefined | null} userId @param {number} [days] */
export function dismissOnboardingWizard(userId, days = 3) {
  const id = String(userId || '').trim();
  if (!id) return;
  const map = readMap();
  map[id] = new Date(Date.now() + days * 86_400_000).toISOString();
  writeMap(map);
}
