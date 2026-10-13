/**
 * `?legacy=1` on the Reports page keeps the pre-Phase-1 report logic reachable until the new numbers are approved.
 */
export function reportsLegacyMode() {
  if (typeof window === 'undefined' || !window.location) return false;
  try {
    return new URLSearchParams(window.location.search).get('legacy') === '1';
  } catch {
    return false;
  }
}

/** `&legacy=1` when legacy mode is on, else ''. */
export function reportsLegacyQuerySuffix() {
  return reportsLegacyMode() ? '&legacy=1' : '';
}
