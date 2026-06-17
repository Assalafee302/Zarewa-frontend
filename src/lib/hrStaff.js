import { apiFetch } from './apiBase';

function numOrUndef(v) {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** @param {object} staff */
export function staffToForm(staff) {
  if (!staff) return null;
  const personal = staff.profileExtra?.personal || {};
  const empMeta = staff.profileExtra?.employmentMeta || {};
  const hrNotes = staff.profileExtra?.hrNotes || {};
  const statutory = staff.profileExtra?.statutory || {};
  const qualifications = staff.profileExtra?.qualifications || {};
  const school = staff.profileExtra?.schoolProfile || {};
  return {
    roleKey: staff.roleKey || '',
    branchId: staff.branchId || staff.normalized?.branchId || '',
    employeeNo: staff.employeeNo || '',
    jobTitle: staff.jobTitle || '',
    department: staff.department || '',
    departmentId: staff.departmentId || '',
    designationId: staff.designationId || '',
    jobDescriptionPreview: '',
    employmentType: staff.employmentType || staff.normalized?.taxonomy?.employmentType || 'permanent',
    employmentStatus: empMeta.employmentStatus || 'active',
    dateJoinedIso: staff.dateJoinedIso || '',
    probationEndIso: staff.probationEndIso || '',
    confirmationDateIso: empMeta.confirmationDateIso || '',
    lineManagerUserId: staff.lineManagerUserId || '',
    selfServiceEligible: Boolean(staff.selfServiceEligible),
    payrollGroup: staff.payrollGroup || staff.profileExtra?.payrollGroup || 'branch_ops',
    salaryLevel: staff.salaryLevel != null ? String(staff.salaryLevel) : '',
    salaryStep: staff.salaryStep != null ? String(staff.salaryStep) : '1',
    baseSalaryNgn: staff.baseSalaryNgn != null ? String(staff.baseSalaryNgn) : '',
    housingAllowanceNgn: staff.housingAllowanceNgn != null ? String(staff.housingAllowanceNgn) : '',
    transportAllowanceNgn: staff.transportAllowanceNgn != null ? String(staff.transportAllowanceNgn) : '',
    payAdditionNgn:
      staff.profileExtra?.compensation?.payAdditionNgn != null
        ? String(staff.profileExtra.compensation.payAdditionNgn)
        : staff.compensation?.payAdditionNgn != null
          ? String(staff.compensation.payAdditionNgn)
          : staff.compensation?.varianceNgn > 0
            ? String(staff.compensation.varianceNgn)
            : '',
    boardMember: Boolean(staff.profileExtra?.employmentMeta?.boardMember),
    payeTaxPercent: staff.payeTaxPercent != null ? String(staff.payeTaxPercent) : '',
    payeTaxNgn: staff.payeTaxNgn != null ? String(staff.payeTaxNgn) : '',
    pensionPercentOverride: staff.pensionPercentOverride != null ? String(staff.pensionPercentOverride) : '',
    taxId: staff.taxId || '',
    pensionRsaPin: staff.pensionRsaPin || '',
    bankName: staff.bankName || '',
    bankAccountName: staff.bankAccountName || '',
    bankAccountNoMasked: staff.bankAccountNoMasked || '',
    bankAccountNo: staff.bankAccountNo || '',
    bankCode: staff.bankCode || '',
    minimumQualification: staff.minimumQualification || '',
    academicQualification: staff.academicQualification || '',
    promotionGrade: staff.promotionGrade || staff.normalized?.taxonomy?.gradeBand || '',
    supervisorName: empMeta.supervisorName || '',
    salaryStatus: empMeta.salaryStatus || 'active',
    payrollRemarks: empMeta.payrollRemarks || '',
    pensionAdministrator: statutory.pensionAdministrator || '',
    nhisNumber: statutory.nhisNumber || '',
    professionalCertificates: qualifications.professionalCertificates || '',
    specialConditions: hrNotes.specialConditions || '',
    corporateTitle: empMeta.corporateTitle || '',
    actingEndDateIso: empMeta.actingEndDateIso || '',
    tenureOverride: false,
    tenureOverrideReason: '',
    secondaryRoles: Array.isArray(empMeta.secondaryRoles) ? empMeta.secondaryRoles : [],
    compensationVarianceType: staff.profileExtra?.compensationVariance?.type || '',
    compensationVarianceNotes: staff.profileExtra?.compensationVariance?.notes || '',
    compensationVarianceReviewDueIso: staff.profileExtra?.compensationVariance?.reviewDueIso || '',
    compensationVarianceMemoRef: staff.profileExtra?.compensationVariance?.memoRef || '',
    applyMatrixPay: false,
    applyRecommendedRoleKey: false,
    trainingSummary: staff.trainingSummary || '',
    welfareNotes: staff.welfareNotes || '',
    hrInternalNotes: hrNotes.internalRemarks || '',
    leaveEntitlementBand: staff.leaveEntitlementBand || '',
    branchChangeReason: '',
    ninNumber: staff.ninNumber || '',
    bvnNumber: staff.bvnNumber || '',
    gender: staff.gender || '',
    dateOfBirthIso: staff.dateOfBirthIso || '',
    contractEndIso: staff.contractEndIso || '',
    nhisProvider: staff.nhisProvider || '',
    nhisMonthlyDeductionNgn:
      staff.nhisDeductionNgn != null
        ? String(staff.nhisDeductionNgn)
        : staff.nhisMonthlyDeductionNgn != null
          ? String(staff.nhisMonthlyDeductionNgn)
          : '',
    firstName: personal.firstName || '',
    middleName: personal.middleName || '',
    surname: personal.surname || '',
    personalEmail: personal.email || staff.email || '',
    phone: personal.phone || '',
    maritalStatus: personal.maritalStatus || '',
    residentialAddress: personal.residentialAddress || '',
    stateOfOrigin: personal.stateOfOrigin || '',
    localGovernment: personal.localGovernment || '',
    nationality: personal.nationality || 'Nigerian',
    bloodGroup: personal.bloodGroup || '',
    institution: personal.institution || '',
    courseField: personal.courseField || '',
    yearCompleted: personal.yearCompleted || '',
    nextOfKinName: staff.nextOfKin?.name || '',
    nextOfKinPhone: staff.nextOfKin?.phone || '',
    nextOfKinRelationship: staff.nextOfKin?.relationship || '',
    nextOfKinAddress: staff.nextOfKin?.address || '',
    nextOfKinAltPhone: staff.nextOfKin?.altPhone || personal.emergencyAltPhone || '',
    schoolBeneficiaryId: school.beneficiaryId || '',
    schoolNameProfile: school.schoolName || staff.department || '',
    schoolClassLevel: school.classLevel || staff.jobTitle || '',
    schoolAcademicSession: school.academicSession || '',
    schoolCurrentTerm: school.currentTerm || '',
    schoolTermStartIso: school.termStartIso || '',
    schoolTermEndIso: school.termEndIso || '',
    schoolFeeCadence: school.feeCadence || 'termly',
    schoolFeesNgnProfile: school.schoolFeesNgn != null ? String(school.schoolFeesNgn) : '',
    schoolNotes: school.notes || '',
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
    altPhone: String(form.nextOfKinAltPhone || '').trim() || null,
  };
}

/** @param {object} form */
export function formToProfilePatch(form, { originalBranchId } = {}) {
  const body = {
    branchId: form.branchId,
    employeeNo: form.employeeNo,
    jobTitle: form.jobTitle,
    department: form.department,
    departmentId: form.departmentId || null,
    designationId: form.designationId || null,
    employmentType: form.employmentType,
    dateJoinedIso: form.dateJoinedIso || null,
    probationEndIso: form.probationEndIso || null,
    lineManagerUserId: form.lineManagerUserId || null,
    selfServiceEligible: form.selfServiceEligible,
    payrollGroup: form.payrollGroup,
    salaryLevel: numOrUndef(form.salaryLevel),
    salaryStep: numOrUndef(form.salaryStep),
    payAdditionNgn: numOrUndef(form.payAdditionNgn) ?? 0,
    baseSalaryNgn: numOrUndef(form.baseSalaryNgn) ?? 0,
    housingAllowanceNgn: numOrUndef(form.housingAllowanceNgn) ?? 0,
    transportAllowanceNgn: numOrUndef(form.transportAllowanceNgn) ?? 0,
    payeTaxPercent: numOrUndef(form.payeTaxPercent),
    payeTaxNgn: numOrUndef(form.payeTaxNgn),
    pensionPercentOverride: numOrUndef(form.pensionPercentOverride),
    taxId: form.taxId || null,
    pensionRsaPin: form.pensionRsaPin || null,
    bankName: form.bankName || null,
    bankAccountName: form.bankAccountName || null,
    bankAccountNoMasked: form.bankAccountNoMasked || null,
    bankAccountNo: form.bankAccountNo || null,
    bankCode: form.bankCode || null,
    minimumQualification: form.minimumQualification || null,
    academicQualification: form.academicQualification || null,
    promotionGrade: form.promotionGrade || null,
    trainingSummary: form.trainingSummary || null,
    welfareNotes: form.welfareNotes || null,
    leaveEntitlementBand: form.leaveEntitlementBand || null,
    ninNumber: String(form.ninNumber || '').trim() || null,
    bvnNumber: String(form.bvnNumber || '').trim() || null,
    gender: form.gender || null,
    dateOfBirthIso: form.dateOfBirthIso || null,
    dateOfBirth: form.dateOfBirthIso || null,
    contractEndIso: form.contractEndIso || null,
    nhisProvider: String(form.nhisProvider || '').trim() || null,
    nhisMonthlyDeductionNgn: numOrUndef(form.nhisMonthlyDeductionNgn) ?? 0,
    nhisDeductionNgn: numOrUndef(form.nhisMonthlyDeductionNgn) ?? 0,
    nextOfKin: nextOfKinFromForm(form),
    employmentStatus: form.employmentStatus || null,
    confirmationDateIso: form.confirmationDateIso || null,
    hrInternalNotes: form.hrInternalNotes || null,
    firstName: form.firstName || null,
    middleName: form.middleName || null,
    surname: form.surname || null,
    phone: form.phone || null,
    personalEmail: form.personalEmail || null,
    maritalStatus: form.maritalStatus || null,
    residentialAddress: form.residentialAddress || null,
    stateOfOrigin: form.stateOfOrigin || null,
    localGovernment: form.localGovernment || null,
    nationality: form.nationality || null,
    bloodGroup: form.bloodGroup || null,
    institution: form.institution || null,
    courseField: form.courseField || null,
    yearCompleted: form.yearCompleted || null,
    supervisorName: form.supervisorName || null,
    salaryStatus: form.salaryStatus || null,
    payrollRemarks: form.payrollRemarks || null,
    pensionAdministrator: form.pensionAdministrator || null,
    nhisNumber: form.nhisNumber || null,
    professionalCertificates: form.professionalCertificates || null,
    specialConditions: form.specialConditions || null,
    corporateTitle: form.corporateTitle || null,
    boardMember: form.boardMember === true,
    actingEndDateIso: form.actingEndDateIso || null,
    tenureOverride: form.tenureOverride === true,
    tenureOverrideReason: form.tenureOverrideReason || null,
    secondaryRoles: Array.isArray(form.secondaryRoles) ? form.secondaryRoles : [],
    compensationVarianceType: form.compensationVarianceType || null,
    compensationVarianceNotes: form.compensationVarianceNotes || null,
    compensationVarianceReviewDueIso: form.compensationVarianceReviewDueIso || null,
    compensationVarianceMemoRef: form.compensationVarianceMemoRef || null,
    applyMatrixPay: form.applyMatrixPay === true,
    applyRecommendedRoleKey: form.applyRecommendedRoleKey === true,
    applyMultiRolePermissions: form.applyMultiRolePermissions === true,
  };
  if (form.payrollGroup === 'scholarship') {
    body.schoolProfile = {
      beneficiaryId: String(form.schoolBeneficiaryId || '').trim() || null,
      schoolName: String(form.schoolNameProfile || form.department || '').trim() || null,
      classLevel: String(form.schoolClassLevel || form.jobTitle || '').trim() || null,
      academicSession: String(form.schoolAcademicSession || '').trim() || null,
      currentTerm: String(form.schoolCurrentTerm || '').trim() || null,
      termStartIso: String(form.schoolTermStartIso || '').trim() || null,
      termEndIso: String(form.schoolTermEndIso || '').trim() || null,
      feeCadence: String(form.schoolFeeCadence || 'termly').trim() || 'termly',
      schoolFeesNgn: numOrUndef(form.schoolFeesNgnProfile),
      notes: String(form.schoolNotes || '').trim() || null,
    };
    if (body.schoolProfile.schoolName) body.department = body.schoolProfile.schoolName;
    if (body.schoolProfile.classLevel) body.jobTitle = body.schoolProfile.classLevel;
  }
  if (originalBranchId && String(form.branchId) !== String(originalBranchId)) {
    body.branchChangeReason = String(form.branchChangeReason || '').trim() || 'Branch transfer';
  }
  return body;
}

const SELF_SERVICE_PROFILE_KEYS = [
  'ninNumber',
  'bvnNumber',
  'firstName',
  'middleName',
  'surname',
  'phone',
  'personalEmail',
  'maritalStatus',
  'residentialAddress',
  'stateOfOrigin',
  'localGovernment',
  'nationality',
  'bloodGroup',
  'gender',
  'dateOfBirthIso',
  'bankName',
  'bankAccountName',
  'bankAccountNo',
  'bankCode',
  'minimumQualification',
  'academicQualification',
  'professionalCertificates',
  'institution',
  'courseField',
  'yearCompleted',
  'nextOfKinName',
  'nextOfKinPhone',
  'nextOfKinRelationship',
  'nextOfKinAddress',
  'nextOfKinAltPhone',
];

/** @param {object} form */
export function formToSelfServiceProfilePatch(form) {
  const full = formToProfilePatch(form);
  /** @type {Record<string, unknown>} */
  const patch = {};
  for (const key of SELF_SERVICE_PROFILE_KEYS) {
    if (full[key] !== undefined) patch[key] = full[key];
  }
  return patch;
}

export async function updateMyHrProfile(form) {
  return apiFetch('/api/hr/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(formToSelfServiceProfilePatch(form)),
  });
}

export async function submitMyHrProfile() {
  return apiFetch('/api/hr/me/profile/submit', { method: 'POST' });
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
