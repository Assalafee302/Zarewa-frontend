/**
 * Chairman Office URLs for scholarships / household (formerly Executive HR family).
 */

export const CHAIRMAN_SCHOLARSHIP_TABS = [
  'beneficiaries',
  'school-fees',
  'stipends',
  'payments',
  'export',
  'expenses',
  'audit',
  'requests',
];

export const CHAIRMAN_HOUSEHOLD_TABS = ['domestic', 'payments'];

const HOUSEHOLD_INNER = new Set(['domestic']);
const SCHOLARSHIP_INNER = new Set(CHAIRMAN_SCHOLARSHIP_TABS);

/**
 * @param {string} [tab]
 * @param {Record<string, string | undefined>} [extra]
 */
export function chairmanOfficeHref(tab = 'pulse', extra = {}) {
  const q = new URLSearchParams();
  if (tab && tab !== 'pulse') q.set('tab', tab);
  for (const [k, v] of Object.entries(extra)) {
    if (v) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `/chairman?${s}` : '/chairman';
}

/**
 * Map old Executive HR family URLs onto Chairman Office.
 * @param {string} [segment]
 * @param {URLSearchParams | { get?: (k: string) => string | null }} [searchParams]
 */
export function chairmanOfficeHrefFromLegacyFamily(segment = '', searchParams) {
  const get = (k) => {
    if (!searchParams) return '';
    if (typeof searchParams.get === 'function') return String(searchParams.get(k) || '').trim();
    return String(searchParams[k] || '').trim();
  };

  const segmentKey = String(segment || '').trim();
  const queryTab = get('tab');
  const inner =
    get('benefitsTab') || (SCHOLARSHIP_INNER.has(queryTab) || HOUSEHOLD_INNER.has(queryTab) ? queryTab : '');
  const extra = {
    staff: get('staff') || undefined,
    beneficiary: get('beneficiary') || undefined,
  };

  const wantsHousehold =
    segmentKey === 'domestic-dashboard' ||
    segmentKey === 'domestic' ||
    queryTab === 'domestic' ||
    inner === 'domestic';
  if (wantsHousehold) {
    return chairmanOfficeHref('household', { benefitsTab: 'domestic', ...extra });
  }

  if (segmentKey === 'scholarship-requests' || segmentKey === 'requests' || queryTab === 'requests') {
    return chairmanOfficeHref('scholarships', { benefitsTab: 'requests', ...extra });
  }

  if (inner && SCHOLARSHIP_INNER.has(inner)) {
    return chairmanOfficeHref('scholarships', { benefitsTab: inner, ...extra });
  }

  return chairmanOfficeHref('scholarships', extra);
}
