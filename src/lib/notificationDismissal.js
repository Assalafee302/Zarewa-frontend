const STORAGE_PREFIX = 'zarewa.notificationDismissals.v1';

/** @returns {string} */
function storageKey(userId) {
  return `${STORAGE_PREFIX}:${String(userId || 'anonymous').trim() || 'anonymous'}`;
}

/** @param {Date} [now] */
export function endOfLocalDayIso(now = new Date()) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** @param {string} userId */
export function loadNotificationDismissals(userId) {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * @param {string} userId
 * @param {Record<string, { until: string }>} dismissals
 */
export function saveNotificationDismissals(userId, dismissals) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(dismissals));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Snooze a notification until end of local day (default) or a custom ISO timestamp.
 * @param {string} userId
 * @param {string} notificationId
 * @param {{ untilIso?: string; untilEndOfDay?: boolean }} [opts]
 */
export function dismissNotification(userId, notificationId, opts = {}) {
  const id = String(notificationId || '').trim();
  if (!id) return loadNotificationDismissals(userId);
  const until =
    opts.untilIso ||
    (opts.untilEndOfDay !== false ? endOfLocalDayIso() : endOfLocalDayIso());
  const dismissals = loadNotificationDismissals(userId);
  dismissals[id] = { until };
  saveNotificationDismissals(userId, dismissals);
  return dismissals;
}

/** @param {Record<string, { until: string }>} dismissals @param {string} notificationId @param {number} [nowMs] */
export function isNotificationDismissed(dismissals, notificationId, nowMs = Date.now()) {
  const entry = dismissals[String(notificationId || '').trim()];
  if (!entry?.until) return false;
  const untilMs = Date.parse(entry.until);
  if (Number.isNaN(untilMs)) return false;
  return untilMs > nowMs;
}

/**
 * Drop expired snooze entries and return active dismissals only.
 * @param {Record<string, { until: string }>} dismissals
 * @param {number} [nowMs]
 */
export function pruneExpiredDismissals(dismissals, nowMs = Date.now()) {
  const out = {};
  for (const [id, entry] of Object.entries(dismissals || {})) {
    const untilMs = Date.parse(entry?.until || '');
    if (!Number.isNaN(untilMs) && untilMs > nowMs) out[id] = entry;
  }
  return out;
}

/**
 * @param {object[]} items
 * @param {Record<string, { until: string }>} dismissals
 * @param {number} [nowMs]
 */
export function filterDismissedNotifications(items, dismissals, nowMs = Date.now()) {
  const list = Array.isArray(items) ? items : [];
  return list.filter((n) => !isNotificationDismissed(dismissals, n.id, nowMs));
}
