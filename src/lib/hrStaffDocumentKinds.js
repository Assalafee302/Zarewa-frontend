/** Keep in sync with backend shared/lib/hrStaffDocuments.js */

export const HR_STAFF_DOC_KINDS = [
  { value: 'birth_certificate', label: 'Birth certificate' },
  { value: 'fslc', label: 'FSLC (First School Leaving Certificate)' },
  { value: 'secondary_certificate', label: 'Secondary school certificate (WAEC/NECO)' },
  { value: 'tertiary_qualification', label: 'Degree / ND / HND / professional qualification' },
  { value: 'guarantor_form', label: 'Guarantor form(s)', downloadableTemplate: true },
  { value: 'employment_letter', label: 'Appointment / employment letter (signed copy)' },
  { value: 'employee_signature', label: 'Signature on white paper' },
  { value: 'nin_slip', label: 'NIN slip / NIN card' },
];

export const HR_REQUIRED_DOC_KINDS = HR_STAFF_DOC_KINDS.map((d) => d.value);

/** @param {string} kind */
export function hrStaffDocKindLabel(kind) {
  return HR_STAFF_DOC_KINDS.find((d) => d.value === kind)?.label || kind;
}

export const CRITICAL_MISSING_LABELS = {
  employeeNo: 'Staff ID',
  dateJoinedIso: 'Date joined',
  jobTitle: 'Job title',
  department: 'Department',
  branchId: 'Branch',
  ninNumber: 'NIN number',
  bvnNumber: 'BVN number',
  nextOfKin: 'Next of kin',
  passportPhoto: 'Passport photograph',
  'doc:birth_certificate': 'Birth certificate',
  'doc:fslc': 'FSLC',
  'doc:secondary_certificate': 'Secondary certificate',
  'doc:tertiary_qualification': 'Tertiary qualification',
  'doc:guarantor_form': 'Guarantor form',
  'doc:employment_letter': 'Appointment / employment letter',
  'doc:employee_signature': 'Signature on white paper',
  'doc:nin_slip': 'NIN slip',
};

export const GUARANTOR_FORM_TEMPLATE_URL = '/api/hr/templates/guarantor-form';
