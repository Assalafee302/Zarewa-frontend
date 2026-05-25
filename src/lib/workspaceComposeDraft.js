const DRAFT_KEY_PREFIX = 'zarewa.compose.memo.draft.v1';

/**
 * @param {string} userId
 */
function draftKey(userId) {
  const uid = String(userId || 'anonymous').trim() || 'anonymous';
  return `${DRAFT_KEY_PREFIX}:${uid}`;
}

/**
 * @typedef {Object} ComposeMemoDraft
 * @property {string} subject
 * @property {string} body
 * @property {string[]} toIds
 * @property {string[]} ccIds
 * @property {string} documentClass
 * @property {string} officeKey
 * @property {string} confidentiality
 * @property {string} memoDate
 * @property {string} [templateId]
 * @property {Record<string,string>} [templateFields]
 * @property {string} [smartMemoType]
 * @property {Record<string,string>} [smartGuidedFields]
 * @property {number} savedAt
 */

/**
 * @param {string} userId
 * @returns {ComposeMemoDraft|null}
 */
export function loadComposeMemoDraft(userId) {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * @param {string} userId
 * @param {Partial<ComposeMemoDraft>} draft
 */
export function saveComposeMemoDraft(userId, draft) {
  try {
    const payload = {
      subject: String(draft.subject || ''),
      body: String(draft.body || ''),
      toIds: Array.isArray(draft.toIds) ? draft.toIds : [],
      ccIds: Array.isArray(draft.ccIds) ? draft.ccIds : [],
      documentClass: String(draft.documentClass || 'correspondence'),
      officeKey: String(draft.officeKey || 'office_admin'),
      confidentiality: String(draft.confidentiality || 'internal'),
      memoDate: String(draft.memoDate || ''),
      templateId: String(draft.templateId || ''),
      templateFields: draft.templateFields && typeof draft.templateFields === 'object' ? draft.templateFields : {},
      smartMemoType: String(draft.smartMemoType || ''),
      smartGuidedFields:
        draft.smartGuidedFields && typeof draft.smartGuidedFields === 'object' ? draft.smartGuidedFields : {},
      savedAt: Date.now(),
    };
    localStorage.setItem(draftKey(userId), JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

/**
 * @param {string} userId
 */
export function clearComposeMemoDraft(userId) {
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {
    /* ignore */
  }
}

/**
 * @param {Partial<ComposeMemoDraft>} draft
 */
export function composeDraftHasContent(draft) {
  if (!draft) return false;
  return Boolean(
    String(draft.subject || '').trim() ||
      String(draft.body || '').trim() ||
      (Array.isArray(draft.toIds) && draft.toIds.length > 0)
  );
}
