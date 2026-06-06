import { apiFetch } from './apiBase';

function numOrUndef(v) {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** @param {object} staff */
export function staffToForm(staff) {
  if (!staff) return null;
  return {
    branchId: staff.branchId || staff.normalized?.branchId || '',
    employeeNo: staff.employeeNo || '',
    jobTitle: staff.jobTitle || '',
    department: staff.department || '',
    employmentType: staff.employmentType || staff.normalized?.taxonomy?.employmentType || 'permanent',
    dateJoinedIso: staff.dateJoinedIso || '',
    probationEndIso: staff.probationEndIso || '',
    lineManagerUserId: staff.lineManagerUserId || '',
    selfServiceEligible: Boolean(staff.selfServiceEligible),
    payrollGroup: staff.payrollGroup || staff.profileExtra?.payrollGroup || 'branch_ops',
    salaryLevel: staff.salaryLevel != null ? String(staff.salaryLevel) : '',
    salaryStep: staff.salaryStep != null ? String(staff.salaryStep) : '1',
    baseSalaryNgn: staff.baseSalaryNgn != null ? String(staff.baseSalaryNgn) : '',
    housingAllowanceNgn: staff.housingAllowanceNgn != null ? String(staff.housingAllowanceNgn) : '',
    transportAllowanceNgn: staff.transportAllowanceNgn != null ? String(staff.transportAllowanceNgn) : '',
    payeTaxPercent: staff.payeTaxPercent != null ? String(staff.payeTaxPercent) : '',
    pensionPercentOverride: staff.pensionPercentOverride != null ? String(staff.pensionPercentOverride) : '',
    taxId: staff.taxId || '',
    pensionRsaPin: staff.pensionRsaPin || '',
    bankName: staff.bankName || '',
    bankAccountName: staff.bankAccountName || '',
    bankAccountNoMasked: staff.bankAccountNoMasked || '',
    minimumQualification: staff.minimumQualification || '',
    academicQualification: staff.academicQualification || '',
    promotionGrade: staff.promotionGrade || staff.normalized?.taxonomy?.gradeBand || '',
    trainingSummary: staff.trainingSummary || '',
    welfareNotes: staff.welfareNotes || '',
    leaveEntitlementBand: staff.leaveEntitlementBand || '',
    branchChangeReason: '',
    ninNumber: staff.ninNumber || '',
    gender: staff.gender || '',
    dateOfBirthIso: staff.dateOfBirthIso || '',
    contractEndIso: staff.contractEndIso || '',
    nhisProvider: staff.nhisProvider || '',
    nhisMonthlyDeductionNgn: staff.nhisMonthlyDeductionNgn != null ? String(staff.nhisMonthlyDeductionNgn) : '',
    nextOfKinName: staff.nextOfKin?.name || '',
    nextOfKinPhone: staff.nextOfKin?.phone || '',
    nextOfKinRelationship: staff.nextOfKin?.relationship || '',
    nextOfKinAddress: staff.nextOfKin?.address || '',
  };
}

function nextOfKinFromForm(form) {
  const name = String(form.nextOfKinName || '').trim();
  const phone = String(form.nextOfKinPhone || '').trim();
  if (!name && !phone) return null;
  return {
    name: name || null,
    phone: phone || null,
    relationship: String(form.nextOfKinRelationship || '').trim() || null,
    address: String(form.nextOfKinAddress || '').trim() || null,
  };
}

/** @param {object} form */
export function formToProfilePatch(form, { originalBranchId } = {}) {
  const body = {
    branchId: form.branchId,
    employeeNo: form.employeeNo,
    jobTitle: form.jobTitle,
    department: form.department,
    employmentType: form.employmentType,
    dateJoinedIso: form.dateJoinedIso || null,
    probationEndIso: form.probationEndIso || null,
    lineManagerUserId: form.lineManagerUserId || null,
    selfServiceEligible: form.selfServiceEligible,
    payrollGroup: form.payrollGroup,
    salaryLevel: numOrUndef(form.salaryLevel),
    salaryStep: numOrUndef(form.salaryStep),
    baseSalaryNgn: numOrUndef(form.baseSalaryNgn) ?? 0,
    housingAllowanceNgn: numOrUndef(form.housingAllowanceNgn) ?? 0,
    transportAllowanceNgn: numOrUndef(form.transportAllowanceNgn) ?? 0,
    payeTaxPercent: numOrUndef(form.payeTaxPercent),
    pensionPercentOverride: numOrUndef(form.pensionPercentOverride),
    taxId: form.taxId || null,
    pensionRsaPin: form.pensionRsaPin || null,
    bankName: form.bankName || null,
    bankAccountName: form.bankAccountName || null,
    bankAccountNoMasked: form.bankAccountNoMasked || null,
    minimumQualification: form.minimumQualification || null,
    academicQualification: form.academicQualification || null,
    promotionGrade: form.promotionGrade || null,
    trainingSummary: form.trainingSummary || null,
    welfareNotes: form.welfareNotes || null,
    leaveEntitlementBand: form.leaveEntitlementBand || null,
    ninNumber: String(form.ninNumber || '').trim() || null,
    gender: form.gender || null,
    dateOfBirthIso: form.dateOfBirthIso || null,
    contractEndIso: form.contractEndIso || null,
    nhisProvider: String(form.nhisProvider || '').trim() || null,
    nhisMonthlyDeductionNgn: numOrUndef(form.nhisMonthlyDeductionNgn) ?? 0,
    nextOfKin: nextOfKinFromForm(form),
  };
  if (originalBranchId && String(form.branchId) !== String(originalBranchId)) {
    body.branchChangeReason = String(form.branchChangeReason || '').trim() || 'Branch transfer';
  }
  return body;
}

/** @param {object} form */
export function formToRegisterBody(form) {
  const body = {
    username: String(form.username || '').trim().toLowerCase(),
    displayName: String(form.displayName || '').trim(),
    password: form.password,
    roleKey: form.roleKey,
    ...formToProfilePatch(form),
  };
  if (form.applicantId) body.applicantId = String(form.applicantId).trim();
  return body;
}

export async function registerHrStaff(body) {
  return apiFetch('/api/hr/staff/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateHrStaffProfile(userId, body) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function fetchHrBranchTransfers() {
  return apiFetch('/api/hr/branch-transfers');
}

export async function fetchHrDisciplinaryEvents() {
  return apiFetch('/api/hr/disciplinary-events');
}

export async function recordHrDisciplinaryEvent(userId, body) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/disciplinary-events`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchHrSalaryHistory(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/salary-history`);
}

export async function applyHrSalaryIncrement(userId, body) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/salary-increment`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createHrLoanRequest(userId, payload) {
  const amountNgn = Math.round(Number(payload.amountNgn) || 0);
  const repaymentMonths = Math.round(Number(payload.repaymentMonths) || 0);
  const deductionPerMonthNgn =
    Math.round(Number(payload.deductionPerMonthNgn) || 0) ||
    (repaymentMonths > 0 ? Math.ceil(amountNgn / repaymentMonths) : 0);
  return apiFetch('/api/hr/requests', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      kind: 'loan',
      title: payload.title || `Staff loan — ₦${amountNgn.toLocaleString('en-NG')}`,
      body: payload.purpose || null,
      payload: {
        amountNgn,
        repaymentMonths,
        deductionPerMonthNgn,
        purpose: payload.purpose || null,
        exceptionalLoan: Boolean(payload.exceptionalLoan),
      },
    }),
  });
}
