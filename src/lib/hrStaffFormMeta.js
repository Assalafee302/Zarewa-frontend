/** Extended staff form options (Phase 5A). */

export const HR_MARITAL_STATUSES = [
  { value: '', label: 'Select…' },
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

export const HR_EMPLOYMENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'probation', label: 'On probation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'exited', label: 'Exited' },
];

export const HR_BLOOD_GROUPS = [
  { value: '', label: 'Not specified' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

export const HR_STAFF_FORM_TABS = [
  { id: 'personal', label: 'Personal' },
  { id: 'employment', label: 'Employment' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'bank', label: 'Bank' },
  { id: 'statutory', label: 'Tax & NHIS' },
  { id: 'nok', label: 'Next of kin' },
  { id: 'qualifications', label: 'Qualifications' },
  { id: 'notes', label: 'HR notes' },
];

export const HR_DOCUMENT_CATEGORIES = [
  { value: 'identity', label: 'Identity documents' },
  { value: 'employment', label: 'Employment documents' },
  { value: 'qualification', label: 'Qualification documents' },
  { value: 'policy', label: 'Policy acknowledgements' },
  { value: 'payroll', label: 'Payroll / statutory' },
  { value: 'disciplinary', label: 'Disciplinary' },
  { value: 'exit', label: 'Exit documents' },
  { value: 'transfer', label: 'Transfer documents' },
  { value: 'loan', label: 'Loan documents' },
  { value: 'other', label: 'Other' },
];
