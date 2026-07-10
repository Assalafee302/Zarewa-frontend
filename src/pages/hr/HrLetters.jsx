import { HrButton, HrAddButton, HR_BTN_PRIMARY, HR_BTN_SECONDARY } from '../../components/hr/hrPageUi';
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canGenerateHrLetters, canApproveHrLetters } from '../../lib/hrAccess';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import {
  downloadEmploymentLetterDocx,
  downloadEmploymentLetterPdf,
  fetchHrLetters,
  generateHrLetter,
  gmReviewHrLetter,
  hrReviewHrLetter,
  isLetterOfficiallyExportable,
  issueHrLetter,
  mdApproveHrLetter,
  recordHrLetterPrint,
  rejectHrLetter,
  submitHrLetter,
} from '../../lib/hrExtended';
import { parseHrLetterDeepLink } from '../../lib/hrLetterDeepLink';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTablePager,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';
import { HrDualView } from '../../components/hr/HrDualView';
import { HrMobileCard, HrMobileCardList } from '../../components/hr/HrMobileCard';
import { HrStatusBadge } from '../../components/hr/HrStatusBadge';
import { HrTableEmptyRow, HrTableLoadingRow } from '../../components/hr/HrTableBodyState';
import { useAppTablePaging } from '../../lib/appDataTable';

const LETTER_GROUPS = [
  {
    label: 'Employment',
    types: ['appointment', 'employment', 'confirmation', 'probation_extension', 'introduction', 'transfer', 'experience', 'certificate_of_service', 'id_card_approval'],
  },
  {
    label: 'Salary & Promotion',
    types: ['salary', 'salary_increment', 'promotion'],
  },
  {
    label: 'Leave',
    types: ['leave_approval', 'leave_rejection'],
  },
  {
    label: 'Discipline',
    types: ['query', 'warning', 'final_warning', 'suspension', 'dismissal', 'termination', 'hearing_invitation', 'investigation_notice', 'salary_recovery'],
  },
  {
    label: 'Exit',
    types: ['resignation_acceptance', 'exit_clearance', 'return_of_property', 'layoff'],
  },
  {
    label: 'Compliance',
    types: ['confidentiality_pledge', 'handbook_receipt', 'code_of_conduct_receipt', 'anti_harassment_ack', 'data_protection', 'conflict_of_interest', 'nda'],
  },
  {
    label: 'Loan',
    types: ['loan_agreement'],
  },
  {
    label: 'Development',
    types: ['training_approval'],
  },
];

const LETTER_TYPES = [
  { value: 'employment', label: 'Employment Confirmation Letter' },
  { value: 'salary', label: 'Salary Confirmation Letter' },
  { value: 'introduction', label: 'Introduction Letter' },
  { value: 'transfer', label: 'Transfer Letter (generic)' },
  { value: 'transfer_inter_branch', label: 'Inter-branch transfer' },
  { value: 'transfer_in_branch', label: 'In-branch transfer' },
  { value: 'transfer_hq_to_branch', label: 'HQ to branch transfer' },
  { value: 'transfer_branch_to_hq', label: 'Branch to HQ transfer' },
  { value: 'transfer_temporary', label: 'Temporary transfer' },
  { value: 'query', label: 'Query Letter' },
  { value: 'warning', label: 'Warning Letter' },
  { value: 'suspension', label: 'Suspension Letter' },
  { value: 'promotion', label: 'Promotion Letter' },
  { value: 'experience', label: 'Experience / Reference Letter' },
  { value: 'loan_agreement', label: 'Loan Agreement Letter' },
  { value: 'termination', label: 'Termination Letter' },
  { value: 'appointment', label: 'Appointment Letter' },
  { value: 'confirmation', label: 'Confirmation After Probation' },
  { value: 'probation_extension', label: 'Probation Extension' },
  { value: 'salary_increment', label: 'Salary Increment Letter' },
  { value: 'training_approval', label: 'Training Approval Letter' },
  { value: 'leave_approval', label: 'Leave Approval Letter' },
  { value: 'leave_rejection', label: 'Leave Rejection Letter' },
  { value: 'dismissal', label: 'Dismissal Letter' },
  { value: 'resignation_acceptance', label: 'Resignation Acceptance' },
  { value: 'exit_clearance', label: 'Exit Clearance Form' },
  { value: 'return_of_property', label: 'Return of Property' },
  { value: 'confidentiality_pledge', label: 'Confidentiality Pledge' },
  { value: 'handbook_receipt', label: 'Handbook Receipt' },
  { value: 'certificate_of_service', label: 'Certificate of Service' },
  { value: 'id_card_approval', label: 'ID Card Approval / Collection' },
  { value: 'hearing_invitation', label: 'Disciplinary hearing invitation' },
  { value: 'investigation_notice', label: 'Investigation notice' },
  { value: 'salary_recovery', label: 'Salary recovery / deduction letter' },
  { value: 'final_warning', label: 'Final warning letter' },
  { value: 'layoff', label: 'Layoff / retrenchment notice' },
  { value: 'code_of_conduct_receipt', label: 'Code of conduct acknowledgement' },
  { value: 'anti_harassment_ack', label: 'Anti-harassment acknowledgement' },
  { value: 'data_protection', label: 'Data protection acknowledgement' },
  { value: 'conflict_of_interest', label: 'Conflict of interest declaration' },
  { value: 'nda', label: 'Non-disclosure agreement' },
  { value: 'bonus_approval', label: 'Bonus approval letter' },
];

const LETTER_TYPE_MAP = Object.fromEntries(LETTER_TYPES.map((t) => [t.value, t]));

const LOCK_MSG = 'This letter must be approved before it can be printed or downloaded.';

/**
 * Extra fields required per letter type.
 * Each field: { key, label, type: 'text'|'date'|'textarea', required? }
 */
const EXTRA_FIELDS = {
  transfer: [
    { key: 'fromBranch', label: 'From Branch', type: 'text', required: true },
    { key: 'toBranch', label: 'To Branch', type: 'text', required: true },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
    { key: 'sourceRecordId', label: 'Transfer request ID (link)', type: 'text' },
  ],
  transfer_inter_branch: [
    { key: 'fromBranch', label: 'From Branch', type: 'text', required: true },
    { key: 'toBranch', label: 'To Branch', type: 'text', required: true },
    { key: 'toDepartment', label: 'New Department', type: 'text' },
    { key: 'toDesignation', label: 'New Designation', type: 'text' },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
    { key: 'sourceRecordId', label: 'Transfer request ID (link)', type: 'text' },
  ],
  transfer_in_branch: [
    { key: 'fromBranch', label: 'Branch', type: 'text' },
    { key: 'fromDepartment', label: 'From Department', type: 'text' },
    { key: 'toDepartment', label: 'To Department', type: 'text', required: true },
    { key: 'toDesignation', label: 'New Designation', type: 'text' },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
    { key: 'sourceRecordId', label: 'Transfer request ID (link)', type: 'text' },
  ],
  transfer_hq_to_branch: [
    { key: 'toBranch', label: 'Destination Branch', type: 'text', required: true },
    { key: 'toDepartment', label: 'Department', type: 'text' },
    { key: 'toDesignation', label: 'Designation', type: 'text' },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
    { key: 'sourceRecordId', label: 'Transfer request ID (link)', type: 'text' },
  ],
  transfer_branch_to_hq: [
    { key: 'fromBranch', label: 'From Branch', type: 'text', required: true },
    { key: 'toDepartment', label: 'HQ Department', type: 'text' },
    { key: 'toDesignation', label: 'Designation', type: 'text' },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
    { key: 'sourceRecordId', label: 'Transfer request ID (link)', type: 'text' },
  ],
  transfer_temporary: [
    { key: 'toBranch', label: 'Temporary location', type: 'text' },
    { key: 'toDepartment', label: 'Temporary department', type: 'text' },
    { key: 'effectiveDate', label: 'Start date', type: 'date', required: true },
    { key: 'endDate', label: 'End date', type: 'date' },
    { key: 'reason', label: 'Purpose', type: 'textarea' },
    { key: 'sourceRecordId', label: 'Transfer request ID (link)', type: 'text' },
  ],
  query: [
    { key: 'incidentDescription', label: 'Incident Description', type: 'textarea', required: true },
    { key: 'responseDeadline', label: 'Response Deadline', type: 'date', required: true },
  ],
  warning: [
    { key: 'offenseDescription', label: 'Offence Description', type: 'textarea', required: true },
    { key: 'warningLevel', label: 'Warning Level (1st / Final)', type: 'text' },
  ],
  suspension: [
    { key: 'suspensionReason', label: 'Reason for Suspension', type: 'textarea', required: true },
    { key: 'suspensionFrom', label: 'Suspension From', type: 'date', required: true },
    { key: 'suspensionTo', label: 'Suspension To (if known)', type: 'date' },
  ],
  promotion: [
    { key: 'newJobTitle', label: 'New Job Title', type: 'text', required: true },
    { key: 'newGrade', label: 'New Grade / Level', type: 'text' },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
    { key: 'newSalary', label: 'New Salary (₦)', type: 'text' },
  ],
  salary: [
    { key: 'salaryAmount', label: 'Monthly Salary (₦)', type: 'text', required: true },
    { key: 'purposeOfLetter', label: 'Purpose / Addressee', type: 'text' },
  ],
  introduction: [
    { key: 'addressee', label: 'Addressee (e.g. Embassy, Bank)', type: 'text' },
    { key: 'purposeOfLetter', label: 'Purpose', type: 'text' },
  ],
  loan_agreement: [
    { key: 'loanAmount', label: 'Loan Amount (₦)', type: 'text', required: true },
    { key: 'repaymentMonths', label: 'Repayment Period (months)', type: 'text', required: true },
    { key: 'monthlyDeduction', label: 'Monthly Deduction (₦)', type: 'text' },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
  ],
  experience: [
    { key: 'addressee', label: 'Addressee / Organisation', type: 'text' },
    { key: 'purposeOfLetter', label: 'Purpose', type: 'text' },
  ],
  employment: [],
  termination: [
    { key: 'terminationDate', label: 'Effective Termination Date', type: 'date', required: true },
    { key: 'terminationReason', label: 'Reason for Termination', type: 'select', options: ['Misconduct', 'Performance', 'Redundancy', 'End of Contract', 'Voluntary Resignation', 'Other'], required: true },
    { key: 'noticePeriod', label: 'Notice Period Given', type: 'text', placeholder: 'e.g. 30 days' },
    { key: 'benefitsNote', label: 'Benefits / Entitlements Note', type: 'textarea', placeholder: 'e.g. Accrued leave will be paid out…' },
  ],
  appointment: [
    { key: 'newJobTitle', label: 'Job Title', type: 'text', required: true },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
  ],
  confirmation: [{ key: 'effectiveDate', label: 'Confirmation Date', type: 'date', required: true }],
  probation_extension: [
    { key: 'newProbationEnd', label: 'New Probation End Date', type: 'date', required: true },
    { key: 'reason', label: 'Reason', type: 'textarea' },
  ],
  salary_increment: [
    { key: 'newSalary', label: 'New Monthly Salary (₦)', type: 'text', required: true },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
    { key: 'reason', label: 'Reason', type: 'text' },
  ],
  training_approval: [
    { key: 'courseTitle', label: 'Course / Programme', type: 'text', required: true },
    { key: 'trainingDates', label: 'Dates', type: 'text' },
    { key: 'venue', label: 'Venue', type: 'text' },
  ],
  leave_approval: [
    { key: 'leaveType', label: 'Leave type', type: 'text' },
    { key: 'startDate', label: 'Start date', type: 'date' },
    { key: 'endDate', label: 'End date', type: 'date' },
    { key: 'daysRequested', label: 'Days approved', type: 'text' },
  ],
  leave_rejection: [
    { key: 'leaveType', label: 'Leave type', type: 'text' },
    { key: 'startDate', label: 'Start date', type: 'date' },
    { key: 'endDate', label: 'End date', type: 'date' },
    { key: 'rejectionReason', label: 'Rejection reason', type: 'textarea', required: true },
  ],
  dismissal: [
    { key: 'terminationDate', label: 'Effective date', type: 'date', required: true },
    { key: 'terminationReason', label: 'Grounds', type: 'textarea', required: true },
  ],
  resignation_acceptance: [{ key: 'lastWorkingDay', label: 'Last working day', type: 'date', required: true }],
  exit_clearance: [
    { key: 'separationType', label: 'Separation type', type: 'text' },
    { key: 'lastWorkingDay', label: 'Last working day', type: 'date' },
  ],
  return_of_property: [{ key: 'propertyList', label: 'Property list', type: 'textarea' }],
  handbook_receipt: [{ key: 'handbookVersion', label: 'Handbook version', type: 'text' }],
  certificate_of_service: [
    { key: 'lastWorkingDay', label: 'Last working day', type: 'date' },
    { key: 'conductNote', label: 'Conduct note', type: 'text' },
  ],
  id_card_approval: [
    { key: 'sourceRecordId', label: 'ID card request ID', type: 'text' },
    { key: 'collectionDate', label: 'Collection date', type: 'date', required: true },
    { key: 'collectionLocation', label: 'Collection location', type: 'text', required: true },
    { key: 'replacementReason', label: 'Replacement reason (if any)', type: 'text' },
  ],
};

/**
 * Generate a formatted letter body from staff data + extra fields.
 */
function generateLetterContent(staffData, letterType, extra) {
  const today = new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' });
  const name = staffData?.displayName || staffData?.username || 'Staff Member';
  const jobTitle = staffData?.jobTitle || 'Staff';
  const department = staffData?.department || '';
  const branch = staffData?.branch || 'HQ';
  const employeeNo = staffData?.employeeNo || '';
  const startDate = staffData?.employmentStartDate?.slice(0, 10) || '';

  const ref = `ZRW/HR/${letterType.toUpperCase().slice(0, 4)}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
  const header = `ZAREWA GROUP
Human Resources Department
Date: ${today}
Ref: ${ref}

To:
${extra?.addressee || 'Whom It May Concern'}

Dear Sir/Madam,\n\n`;

  const footer = `\n\nYours faithfully,

_______________________________
HR Manager
Zarewa Group
Human Resources Department`;

  switch (letterType) {
    case 'employment':
      return `${header}RE: EMPLOYMENT CONFIRMATION — ${name.toUpperCase()}

This is to certify that ${name} (Employee No: ${employeeNo}) is a bona fide employee of Zarewa Group in the capacity of ${jobTitle}${department ? `, ${department} Department` : ''}, ${branch}.

${name} has been in our employ since ${startDate || 'date of appointment'} and remains in active employment as at the date of this letter.

This letter is issued upon the employee's request for whatever purpose it may serve.${footer}`;

    case 'salary':
      return `${header}RE: SALARY CONFIRMATION — ${name.toUpperCase()}

This is to confirm that ${name} (Employee No: ${employeeNo}), ${jobTitle}${department ? `, ${department}` : ''}, is currently earning a monthly gross salary of ₦${extra?.salaryAmount || '[AMOUNT]'}.

${extra?.purposeOfLetter ? `This letter is issued for the purpose of ${extra.purposeOfLetter}.` : 'This letter is issued upon request.'}${footer}`;

    case 'introduction':
      return `${header}RE: INTRODUCTION — ${name.toUpperCase()}

We write to introduce ${name} (Employee No: ${employeeNo}), who is our ${jobTitle} in the ${department || 'relevant'} Department.

${name} has been in our employ since ${startDate || 'date of appointment'} and is in good standing with the organisation.${extra?.purposeOfLetter ? `\n\nThe purpose of this introduction is: ${extra.purposeOfLetter}.` : ''}

We request that you extend every professional courtesy to the bearer of this letter and be assured of our cooperation at all times.${footer}`;

    case 'transfer':
      return `${header}RE: LETTER OF TRANSFER — ${name.toUpperCase()}

Following a review of operational requirements, we wish to inform you that your transfer has been approved with the following details:

  Staff Name:      ${name}
  Employee No:     ${employeeNo}
  Current Branch:  ${extra?.fromBranch || '[FROM BRANCH]'}
  Transfer To:     ${extra?.toBranch || '[TO BRANCH]'}
  Effective Date:  ${extra?.effectiveDate || '[DATE]'}

You are expected to report to your new duty post on or before the effective date above. Please hand over all responsibilities and company property before your departure.

We trust that you will maintain the same level of diligence and commitment at your new station.${footer}`;

    case 'query':
      return `${header}RE: LETTER OF QUERY — ${name.toUpperCase()}

It has come to the attention of management that the following incident occurred involving you:

${extra?.incidentDescription || '[INCIDENT DESCRIPTION]'}

You are hereby required to provide a written response to this query within ${extra?.responseDeadline ? `${extra.responseDeadline}` : '48 hours'} of receipt of this letter.

Failure to respond within the stipulated period may result in disciplinary action being taken against you without further notice.

Please note that this letter does not represent a determination of guilt and is issued solely to afford you the opportunity to state your case.${footer}`;

    case 'warning':
      return `${header}RE: ${extra?.warningLevel ? extra.warningLevel.toUpperCase() + ' ' : ''}WARNING LETTER — ${name.toUpperCase()}

This letter serves as a formal warning following the incident outlined below:

${extra?.offenseDescription || '[OFFENCE DESCRIPTION]'}

Management takes this matter very seriously. You are hereby warned to desist from any conduct that is in violation of company policy.

A repeat of such conduct will result in more severe disciplinary action, up to and including termination of employment.

Please acknowledge receipt of this letter by signing below.${footer}`;

    case 'suspension':
      return `${header}RE: LETTER OF SUSPENSION — ${name.toUpperCase()}

Following investigations into the incident involving you, management has decided to place you on suspension with the following details:

  Reason:           ${extra?.suspensionReason || '[REASON]'}
  Suspension From:  ${extra?.suspensionFrom || '[DATE]'}
  ${extra?.suspensionTo ? `Suspension To:    ${extra.suspensionTo}\n` : ''}
You are required to hand over all company property and access credentials with immediate effect and are not permitted to access company premises during this period.

You will be notified in writing of the outcome of the investigation.${footer}`;

    case 'promotion':
      return `${header}RE: LETTER OF PROMOTION — ${name.toUpperCase()}

We are pleased to inform you that following a review of your performance and contributions to the organisation, management has approved your promotion with the following details:

  Staff Name:    ${name}
  Employee No:   ${employeeNo}
  New Job Title: ${extra?.newJobTitle || '[NEW TITLE]'}
  ${extra?.newGrade ? `New Grade:     ${extra.newGrade}\n` : ''}${extra?.newSalary ? `  New Salary:   ₦${extra.newSalary}\n` : ''}  Effective:     ${extra?.effectiveDate || '[DATE]'}

This promotion is in recognition of your dedication and exemplary service. We trust that you will continue to bring the same level of commitment to your new role.

Congratulations and best wishes in your new position.${footer}`;

    case 'experience':
      return `${header}RE: REFERENCE / EXPERIENCE LETTER — ${name.toUpperCase()}

This is to certify that ${name} (Employee No: ${employeeNo}) was/is employed as ${jobTitle}${department ? ` in the ${department} Department` : ''} at Zarewa Group${branch ? `, ${branch}` : ''}.

${startDate ? `${name} joined our organisation on ${startDate}` : `${name} has been with our organisation`} and has consistently demonstrated professionalism, reliability, and a strong work ethic.

We recommend ${name} without reservation and are confident that ${name} will be an asset to any organisation.${extra?.purposeOfLetter ? `\n\nThis letter is issued for the purpose of: ${extra.purposeOfLetter}.` : ''}${footer}`;

    case 'loan_agreement':
      return `${header}RE: STAFF LOAN AGREEMENT — ${name.toUpperCase()}

This letter serves as a formal loan agreement between Zarewa Group (the Employer) and ${name} (the Employee).

LOAN DETAILS:
  Employee Name:        ${name}
  Employee No:          ${employeeNo}
  Loan Amount:          ₦${extra?.loanAmount || '[AMOUNT]'}
  Repayment Period:     ${extra?.repaymentMonths || '[N]'} months
  Monthly Deduction:    ₦${extra?.monthlyDeduction || '[AMOUNT]'}
  Effective Date:       ${extra?.effectiveDate || '[DATE]'}

TERMS AND CONDITIONS:
1. The loan amount will be recovered through monthly salary deductions commencing on the effective date above.
2. Should employment be terminated for any reason before full repayment, the outstanding balance becomes immediately due.
3. The employee consents to this deduction arrangement by signing this agreement.

Employee Signature: ___________________________  Date: __________

HR Manager Signature: ________________________  Date: __________${footer}`;

    case 'termination':
      return `ZAREWA ALUMINIUM & PLASTICS LTD
Human Resources Department
Date: ${today}

${name}
${jobTitle}
${branch}

Dear ${name.split(' ')[0] || name},

TERMINATION OF APPOINTMENT

We write to formally notify you that your appointment with Zarewa Aluminium & Plastics Ltd is hereby terminated effective ${extra?.terminationDate || '[date]'}.

Reason: ${extra?.terminationReason || '[reason]'}

${extra?.noticePeriod ? `Notice Period: ${extra.noticePeriod}` : 'This termination is with immediate effect.'}

${extra?.benefitsNote ? `Entitlements: ${extra.benefitsNote}` : 'You are entitled to all accrued benefits as applicable under company policy.'}

Please ensure the return of all company property including ID card, office keys, and any equipment issued to you before your last working day.

We wish you the best in your future endeavours.

Yours sincerely,

_______________________
Human Resources Manager
Zarewa Aluminium & Plastics Ltd`;

    case 'id_card_approval':
      return `${header}RE: STAFF ID CARD APPROVAL — ${name.toUpperCase()}

We are pleased to inform you that your staff identification card request${extra?.sourceRecordId ? ` (${extra.sourceRecordId})` : ''} has been approved and processed.

  Employee Name:   ${name}
  Employee No:     ${employeeNo || '—'}
  Job Title:       ${jobTitle}
  Department:      ${department || '—'}
  Branch:          ${branch}
${extra?.replacementReason ? `  Request reason:  ${extra.replacementReason}` : ''}

Your ID card is ready for collection on ${extra?.collectionDate || '[collection date]'} from ${extra?.collectionLocation || 'the HR office'}.

Please bring this letter and a valid means of identification when collecting your card. If you are replacing a lost card, any applicable replacement fee must be settled before collection.

For enquiries, contact the Human Resources Department.${footer}`;

    default:
      return `${header}RE: HR LETTER — ${name.toUpperCase()}\n\n[Letter content]\n${footer}`;
  }
}

const AWAITING_APPROVAL_STATUSES = new Set(['submitted', 'hr_review', 'gm_review', 'md_review']);

export default function HrLetters({ embedded = false } = {}) {
  const ws = useWorkspace();
  const [searchParams] = useSearchParams();
  const canGenerate = canGenerateHrLetters(ws?.permissions);
  const canApprove = canApproveHrLetters(ws?.permissions);

  const [modalOpen, setModalOpen] = useState(false);
  const [staff, setStaff] = useState([]);
  const [letters, setLetters] = useState([]);
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState(() => searchParams.get('filter') || '');
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');

  // Form state
  const [userId, setUserId] = useState('');
  const [letterKind, setLetterKind] = useState('employment');
  const [extraFields, setExtraFields] = useState({});
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [formErr, setFormErr] = useState('');

  // Print modal
  const [printModal, setPrintModal] = useState(false);
  const [printContent, setPrintContent] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (ok && data?.ok) setStaff(data.staff || []);
    return { hasData: true };
  }, []);

  useEffect(() => {
    const link = parseHrLetterDeepLink(searchParams);
    if (!link.letterKind && !link.userId) return;
    if (link.letterKind) setLetterKind(link.letterKind);
    if (link.userId) setUserId(link.userId);
    if (link.extra && Object.keys(link.extra).length) setExtraFields((prev) => ({ ...prev, ...link.extra }));
    if (link.letterKind || link.userId) {
      setModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const f = searchParams.get('filter') || '';
    setQuickFilter(f);
  }, [searchParams]);

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrLetters();
    if (!ok || !data?.ok) {
      setLetters([]);
      return { error: data?.error || 'Could not load letters.', hasData: false };
    }
    setLetters(data.letters || []);
    return { hasData: true };
  }, []);

  const currentExtraFields = EXTRA_FIELDS[letterKind] || [];

  const updatePreview = () => {
    if (!userId) { setPreview(''); return; }
    const person = staff.find((s) => s.userId === userId);
    setPreview(generateLetterContent(person, letterKind, extraFields));
  };

  const onGenerate = async (e) => {
    e.preventDefault();
    if (!canGenerate || !userId) return;
    setMessage('');
    setFormErr('');

    const missing = currentExtraFields.filter((f) => f.required && !String(extraFields[f.key] || '').trim());
    if (missing.length) {
      setFormErr(`Required: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }

    setBusy(true);

    const person = staff.find((s) => s.userId === userId);
    const localContent = generateLetterContent(person, letterKind, extraFields);
    setPreview(localContent);

    // Try server-side generation; fall back to local preview gracefully
    const { ok, data } = await generateHrLetter({
      userId,
      letterKind,
      extraData: {
        ...extraFields,
        sourceRecordKind: extraFields.sourceRecordId
          ? letterKind.includes('transfer')
            ? 'hr_transfer_request'
            : letterKind.includes('leave')
              ? 'hr_leave_request'
              : letterKind.includes('exit')
                ? 'hr_exit_clearance'
                : letterKind.includes('loan')
                  ? 'hr_loan_request'
                  : null
          : null,
        sourceRecordId: extraFields.sourceRecordId || null,
      },
      contentText: localContent,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      // Server may not support all types yet — show local preview and warn
      setFormErr(data?.error ? `Server: ${data.error} — local preview shown below.` : '');
      setMessage('Preview generated locally. Save to server may require server support for this letter type.');
    } else {
      setPreview(data.contentText || localContent);
      setMessage('Draft letter saved. Submit for approval before official download or print.');
    }
    await reload();
  };

  const openPrint = () => {
    setActionErr(LOCK_MSG);
  };

  const runLetterAction = async (fn) => {
    setActionMsg('');
    setActionErr('');
    const { ok, data } = await fn();
    if (!ok || data?.ok === false) {
      setActionErr(data?.error || LOCK_MSG);
      return;
    }
    setActionMsg('Letter updated.');
    await reload();
  };

  const openDraftPreview = (letterId) => {
    window.open(apiUrl(`/api/hr/employment-letters/${encodeURIComponent(letterId)}/preview`), '_blank');
  };

  const tryDownloadPdf = async (letterId, status) => {
    if (!isLetterOfficiallyExportable(status)) {
      setActionErr(LOCK_MSG);
      return;
    }
    const r = await downloadEmploymentLetterPdf(letterId);
    if (!r.ok) setActionErr(r.error || LOCK_MSG);
  };

  const tryDownloadDocx = async (letterId, status) => {
    if (!isLetterOfficiallyExportable(status)) {
      setActionErr(LOCK_MSG);
      return;
    }
    const r = await downloadEmploymentLetterDocx(letterId);
    if (!r.ok) setActionErr(r.error || LOCK_MSG);
  };

  const tryPrint = async (letter) => {
    if (!isLetterOfficiallyExportable(letter.status)) {
      setActionErr(LOCK_MSG);
      return;
    }
    await recordHrLetterPrint(letter.id);
    setPrintContent(letter.contentText || '');
    setPrintModal(true);
  };

  const filteredLetters = letters.filter((l) => {
    if (quickFilter === 'awaiting_approval' && !AWAITING_APPROVAL_STATUSES.has(String(l.status || ''))) {
      return false;
    }
    if (quickFilter === 'discipline' && !['query', 'warning', 'final_warning', 'suspension', 'dismissal', 'termination', 'hearing_invitation', 'investigation_notice', 'salary_recovery'].includes(l.letterKind)) {
      return false;
    }
    if (!search) return true;
    const person = staff.find((s) => s.userId === l.userId);
    const name = (person?.displayName || l.userId || '').toLowerCase();
    const kind = (l.letterKind || '').toLowerCase();
    return name.includes(search.toLowerCase()) || kind.includes(search.toLowerCase());
  });

  const letterPaging = useAppTablePaging(filteredLetters, 20, quickFilter, search);

  const renderLetterActions = (l, status, official) => (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="text-xs font-bold text-zarewa-teal hover:underline" onClick={() => openDraftPreview(l.id)}>
        Preview
      </button>
      {canGenerate && ['draft', 'rejected'].includes(status) ? (
        <button type="button" className="text-xs font-bold text-sky-700 hover:underline" onClick={() => runLetterAction(() => submitHrLetter(l.id))}>
          Submit
        </button>
      ) : null}
      {canApprove && status === 'submitted' ? (
        <button type="button" className="text-xs font-bold text-indigo-700 hover:underline" onClick={() => runLetterAction(() => hrReviewHrLetter(l.id, { approve: true }))}>
          HR approve
        </button>
      ) : null}
      {canApprove && ['hr_review', 'gm_review'].includes(status) ? (
        <button type="button" className="text-xs font-bold text-violet-700 hover:underline" onClick={() => runLetterAction(() => gmReviewHrLetter(l.id, { approve: true }))}>
          GM approve
        </button>
      ) : null}
      {canApprove && status === 'md_review' ? (
        <button type="button" className="text-xs font-bold text-purple-700 hover:underline" onClick={() => runLetterAction(() => mdApproveHrLetter(l.id, { approve: true }))}>
          MD approve
        </button>
      ) : null}
      {canApprove && ['approved', 'md_review', 'gm_review', 'hr_review'].includes(status) ? (
        <button type="button" className="text-xs font-bold text-teal-700 hover:underline" onClick={() => runLetterAction(() => issueHrLetter(l.id))}>
          Issue
        </button>
      ) : null}
      {canApprove && !['issued', 'rejected', 'cancelled'].includes(status) ? (
        <button type="button" className="text-xs font-bold text-red-600 hover:underline" onClick={() => runLetterAction(() => rejectHrLetter(l.id, 'Rejected from letters hub'))}>
          Reject
        </button>
      ) : null}
      <button type="button" className={`text-xs font-bold hover:underline ${official ? 'text-slate-600' : 'text-slate-300'}`} onClick={() => tryDownloadPdf(l.id, status)}>
        PDF
      </button>
      <button type="button" className={`text-xs font-bold hover:underline ${official ? 'text-slate-600' : 'text-slate-300'}`} onClick={() => tryDownloadDocx(l.id, status)}>
        Word
      </button>
      <button type="button" className={`text-xs font-bold hover:underline ${official ? 'text-slate-600' : 'text-slate-300'}`} onClick={() => tryPrint(l)}>
        Print
      </button>
      {l.rejectionReason ? <p className="mt-1 w-full text-xs text-red-700">Rejected: {l.rejectionReason}</p> : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body > *:not(#letter-print-root) { display: none !important; }
          #letter-print-root {
            display: block !important;
            position: fixed; top: 0; left: 0;
            width: 100%; padding: 48px;
            font-family: 'Times New Roman', serif;
            font-size: 12pt; line-height: 1.6;
            color: #000; background: #fff;
            white-space: pre-wrap;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Hidden print root */}
      <div id="letter-print-root" style={{ display: 'none' }}>
        {printContent}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 no-print">
        {!embedded ? (
          <p className="text-sm text-slate-600 max-w-2xl">
            Issue employment, disciplinary, transfer, promotion, and other HR letters. Letters are stored on the employee file.
          </p>
        ) : null}
        {canGenerate ? <HrAddFormButton onClick={() => { setModalOpen(true); setPreview(''); setFormErr(''); setMessage(''); }}>Generate letter</HrAddFormButton> : null}
      </div>

      {/* Generate modal */}
      <HrFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setPreview(''); setFormErr(''); }}
        title="Generate HR Letter"
        size="xl"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: form */}
          <form onSubmit={onGenerate} className="space-y-3">
            {formErr ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{formErr}</div>
            ) : null}
            {message ? <p className="text-sm text-emerald-800 font-semibold">{message}</p> : null}

            <label className="text-xs font-semibold text-slate-600 block">
              Staff Member
              <select
                className={HR_FIELD_CLASS}
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setPreview(''); }}
                required
              >
                <option value="">Select…</option>
                {staff.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.displayName || s.username}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600 block">
              Letter Type
              <select
                className={HR_FIELD_CLASS}
                value={letterKind}
                onChange={(e) => { setLetterKind(e.target.value); setExtraFields({}); setPreview(''); }}
              >
                {LETTER_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.types.map((v) => {
                      const t = LETTER_TYPE_MAP[v];
                      return t ? <option key={v} value={v}>{t.label}</option> : null;
                    })}
                  </optgroup>
                ))}
              </select>
            </label>

            {currentExtraFields.length === 0 && userId ? (
              <p className="text-xs text-slate-500 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                No additional fields required — select Preview to review before saving.
              </p>
            ) : null}

            {/* Dynamic extra fields */}
            {currentExtraFields.map((f) => (
              <label key={f.key} className="text-xs font-semibold text-slate-600 block">
                {f.label}
                {f.type === 'textarea' ? (
                  <textarea
                    className={HR_FIELD_CLASS}
                    rows={3}
                    required={f.required}
                    placeholder={f.placeholder || ''}
                    value={extraFields[f.key] || ''}
                    onChange={(e) => setExtraFields({ ...extraFields, [f.key]: e.target.value })}
                  />
                ) : f.type === 'select' ? (
                  <select
                    className={HR_FIELD_CLASS}
                    required={f.required}
                    value={extraFields[f.key] || ''}
                    onChange={(e) => setExtraFields({ ...extraFields, [f.key]: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {(f.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    className={HR_FIELD_CLASS}
                    required={f.required}
                    placeholder={f.placeholder || ''}
                    value={extraFields[f.key] || ''}
                    onChange={(e) => setExtraFields({ ...extraFields, [f.key]: e.target.value })}
                  />
                )}
              </label>
            ))}

            <div className="flex gap-2">
              <HrButton
                type="button"
                onClick={updatePreview}
                variant="secondary"
                disabled={!userId}
              >
                Preview
              </HrButton>
              <HrButton type="submit" disabled={busy || !userId} >
                {busy ? 'Generating…' : 'Generate & Save'}
              </HrButton>
              {preview && (
                <button type="button" onClick={openPrint} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-400 cursor-not-allowed" title={LOCK_MSG}>
                  Print locked (draft)
                </button>
              )}
            </div>
          </form>

          {/* Right: preview */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preview</p>
            {preview ? (
              <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800 max-h-[480px] overflow-y-auto font-mono leading-relaxed">
                {preview}
              </pre>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
                Select staff and letter type, then click Preview
              </div>
            )}
          </div>
        </div>
      </HrFormModal>

      {/* Print modal */}
      <HrFormModal isOpen={printModal} onClose={() => setPrintModal(false)} title="Print Letter" size="lg">
        <div className="space-y-3">
          <pre className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-white p-5 text-sm text-slate-800 font-mono leading-relaxed max-h-[50vh] overflow-y-auto">
            {printContent}
          </pre>
          <div className="flex gap-2 justify-end no-print">
            <button type="button" onClick={() => setPrintModal(false)} className={HR_BTN_SECONDARY}>Close</button>
            <button type="button" onClick={() => window.print()} className={HR_BTN_PRIMARY}>Print</button>
          </div>
        </div>
      </HrFormModal>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {actionErr ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{actionErr}</div> : null}
      {actionMsg ? <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{actionMsg}</div> : null}

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        <input
          className={`${HR_FIELD_CLASS} max-w-xs`}
          placeholder="Search by staff or letter type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {canApprove ? (
          <>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide border ${
                quickFilter === 'awaiting_approval'
                  ? 'bg-violet-800 text-white border-violet-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => setQuickFilter((f) => (f === 'awaiting_approval' ? '' : 'awaiting_approval'))}
            >
              Awaiting my approval
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide border ${
                quickFilter === 'discipline'
                  ? 'bg-teal-800 text-white border-teal-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => setQuickFilter((f) => (f === 'discipline' ? '' : 'discipline'))}
            >
              Discipline letters
            </button>
          </>
        ) : null}
      </div>

      <HrDualView
        mobile={
          <HrMobileCardList loading={loading && !letters.length} loadingMessage="Loading letters…" emptyMessage="No letters found.">
            {letterPaging.slice.map((l) => {
              const person = staff.find((s) => s.userId === l.userId);
              const typeLabel = LETTER_TYPES.find((t) => t.value === l.letterKind)?.label || l.letterKind;
              const status = l.status || 'issued';
              const official = isLetterOfficiallyExportable(status);
              return (
                <HrMobileCard
                  key={l.id}
                  title={person?.displayName || l.userId}
                  titleLink={person ? `/hr/employees/${l.userId}` : undefined}
                  badge={<HrStatusBadge status={status} variant="letter" />}
                  fields={[
                    { label: 'Reference', value: l.referenceNumber || '—' },
                    { label: 'Type', value: typeLabel },
                    { label: 'Issued', value: l.issuedAtIso?.slice(0, 10) || l.submittedAtIso?.slice(0, 10) || '—', colSpan: 2 },
                  ]}
                  footer={renderLetterActions(l, status, official)}
                />
              );
            })}
          </HrMobileCardList>
        }
        desktop={
          <AppTableWrap className="overflow-x-auto -mx-1 px-1">
            <AppTable>
              <AppTableThead>
                <AppTableTh>Status</AppTableTh>
                <AppTableTh>Reference</AppTableTh>
                <AppTableTh>Staff</AppTableTh>
                <AppTableTh>Type</AppTableTh>
                <AppTableTh>Issued</AppTableTh>
                <AppTableTh>Actions</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {loading && !letters.length ? (
                  <HrTableLoadingRow colSpan={6} message="Loading letters…" />
                ) : null}
                {!loading && !filteredLetters.length ? (
                  <HrTableEmptyRow colSpan={6} message="No letters found." />
                ) : null}
                {letterPaging.slice.map((l) => {
                  const person = staff.find((s) => s.userId === l.userId);
                  const typeLabel = LETTER_TYPES.find((t) => t.value === l.letterKind)?.label || l.letterKind;
                  const status = l.status || 'issued';
                  const official = isLetterOfficiallyExportable(status);
                  return (
                    <AppTableTr key={l.id}>
                      <AppTableTd truncate={false}>
                        <HrStatusBadge status={status} variant="letter" />
                      </AppTableTd>
                      <AppTableTd className="font-mono text-xs">{l.referenceNumber || '—'}</AppTableTd>
                      <AppTableTd>
                        {person ? (
                          <Link to={`/hr/employees/${l.userId}`} className="font-semibold text-zarewa-teal hover:underline">
                            {person.displayName || l.userId}
                          </Link>
                        ) : l.userId}
                      </AppTableTd>
                      <AppTableTd>{typeLabel}</AppTableTd>
                      <AppTableTd>{l.issuedAtIso?.slice(0, 10) || l.submittedAtIso?.slice(0, 10) || '—'}</AppTableTd>
                      <AppTableTd truncate={false}>{renderLetterActions(l, status, official)}</AppTableTd>
                    </AppTableTr>
                  );
                })}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        }
      />
      {letterPaging.total > letterPaging.pageSize ? (
        <AppTablePager
          showingFrom={letterPaging.showingFrom}
          showingTo={letterPaging.showingTo}
          total={letterPaging.total}
          hasPrev={letterPaging.hasPrev}
          hasNext={letterPaging.hasNext}
          onPrev={letterPaging.goPrev}
          onNext={letterPaging.goNext}
        />
      ) : null}
    </div>
  );
}
