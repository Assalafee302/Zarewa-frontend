import { HR_SELF_SERVICE_PATH } from './hrSelfServiceRoutes';

export const ID_CARD_REQUEST_TYPES = [
  { value: 'new', label: 'New employee — first ID card' },
  { value: 'replacement', label: 'Replacement card' },
  { value: 'temporary', label: 'Temporary card only' },
];

export const ID_CARD_REPLACEMENT_REASONS = [
  { value: '', label: 'Select…' },
  { value: 'Lost', label: 'Lost / stolen' },
  { value: 'Damaged', label: 'Damaged' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Name change', label: 'Name / detail change' },
  { value: 'Other', label: 'Other' },
];

export const ID_CARD_OPEN_STATUSES = new Set(['pending', 'processing', 'printed', 'ready']);

export function blankIdCardApplyForm() {
  return {
    requestType: 'new',
    reason: '',
    notes: '',
    bloodGroup: '',
    emergencyContact: '',
    lostDamaged: false,
    lostCardAcknowledged: false,
  };
}

/** @param {string} status */
export function idCardStatusVariant(status) {
  const s = String(status || '').toLowerCase();
  if (['collected', 'ready', 'printed', 'reissued'].includes(s)) return 'approved';
  if (s === 'expired') return 'rejected';
  return 'pending';
}

/** @param {object} request */
export function idCardRequestTitle(request) {
  const type = request?.requestType || request?.request_type || 'new';
  const reason = request?.reason || request?.replacementReason || request?.replacement_reason;
  const typeLabel = ID_CARD_REQUEST_TYPES.find((t) => t.value === type)?.label || String(type).replace(/_/g, ' ');
  if (reason) return `${typeLabel} — ${reason}`;
  return typeLabel;
}

/** @param {object | null | undefined} staff */
export function emergencyContactFromStaff(staff) {
  const nok = staff?.nextOfKin;
  if (!nok) return '';
  const name = String(nok.name || '').trim();
  const phone = String(nok.phone || nok.altPhone || '').trim();
  if (!name && !phone) return '';
  return [name, phone].filter(Boolean).join(' — ');
}

/** @param {object | null | undefined} staff */
export function bloodGroupFromStaff(staff) {
  return String(staff?.profileExtra?.personal?.bloodGroup || staff?.bloodGroup || '').trim();
}

/** @param {string} reason */
export function isLostCardReason(reason) {
  return String(reason || '').trim() === 'Lost';
}

/** @param {object} form */
export function requiresLostCardAck(form) {
  return form?.requestType === 'replacement' && isLostCardReason(form.reason);
}

/** @param {object} form */
export function validateIdCardApplyForm(form) {
  if (form.requestType === 'replacement' && !String(form.reason || '').trim()) {
    return { ok: false, error: 'Please select a reason for the replacement.' };
  }
  if (requiresLostCardAck(form) && !form.lostCardAcknowledged) {
    return { ok: false, error: 'Please acknowledge the lost card replacement policy.' };
  }
  return { ok: true };
}

/** @param {object} form @param {string} userId */
export function idCardApplyPayload(form, userId) {
  const reason = String(form.reason || '').trim();
  const isReplacement = form.requestType === 'replacement';
  const baseNotes = String(form.notes || '').trim();
  const ackNote = requiresLostCardAck(form) && form.lostCardAcknowledged
    ? 'Employee acknowledged lost card replacement policy.'
    : '';
  const notes = [baseNotes, ackNote].filter(Boolean).join(' ') || null;

  return {
    userId,
    requestType: form.requestType || 'new',
    reason: isReplacement ? reason : null,
    replacementReason: isReplacement ? reason : null,
    notes,
    bloodGroup: String(form.bloodGroup || '').trim() || null,
    emergencyContact: String(form.emergencyContact || '').trim() || null,
    lostDamaged: isLostDamagedReason(reason),
  };
}

/** @param {object[]} requests */
export function hasOpenIdCardRequest(requests) {
  return (requests || []).some((r) => ID_CARD_OPEN_STATUSES.has(String(r.status || '').toLowerCase()));
}

/** @param {object | null | undefined} staff @param {string | null | undefined} avatarUrl */
export function idCardProfileWarnings(staff, avatarUrl) {
  const warnings = [];
  const photo = String(avatarUrl || '').trim();
  const hasPhoto = photo.startsWith('https://') || photo.startsWith('data:image/');
  if (!hasPhoto) {
    warnings.push({
      message: 'Upload a passport photograph before HR can print the card.',
      to: HR_SELF_SERVICE_PATH.documents,
      linkLabel: 'Go to Documents',
    });
  }
  if (!String(staff?.employeeNo || '').trim()) {
    warnings.push({
      message: 'Employee number is not set yet.',
      to: HR_SELF_SERVICE_PATH.employment,
      linkLabel: 'View employment',
    });
  }
  if (!String(staff?.jobTitle || '').trim()) {
    warnings.push({
      message: 'Job title is missing from the profile.',
      to: HR_SELF_SERVICE_PATH.employment,
      linkLabel: 'View employment',
    });
  }
  return warnings;
}

/** @param {string} reason */
export function isLostDamagedReason(reason) {
  const r = String(reason || '').trim();
  return r === 'Lost' || r === 'Damaged';
}

/** @param {object | null | undefined} staff @param {object} form @param {string} [requestId] */
export function buildIdCardPreviewRequest(staff, form, requestId = 'PREVIEW') {
  return {
    id: requestId,
    requestType: form.requestType,
    bloodGroup: form.bloodGroup || bloodGroupFromStaff(staff) || '',
    emergencyContact: form.emergencyContact || emergencyContactFromStaff(staff) || '',
    displayName: staff?.displayName,
    employeeNo: staff?.employeeNo,
    jobTitle: staff?.jobTitle,
    department: staff?.department,
    branchId: staff?.branchId,
    avatarUrl: staff?.avatarUrl,
  };
}

/** @param {object | null | undefined} staff */
export function buildIdCardPreviewPerson(staff) {
  if (!staff) return null;
  return {
    displayName: staff.displayName,
    employeeNo: staff.employeeNo,
    jobTitle: staff.jobTitle,
    department: staff.department,
    branchId: staff.branchId,
    avatarUrl: staff.avatarUrl,
  };
}
