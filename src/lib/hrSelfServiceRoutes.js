/** Canonical base for employee HR self-service (leave, payslips, documents, etc.). */
export const HR_SELF_SERVICE_BASE = '/my-profile';

/** @type {Record<string, string>} */
export const HR_SELF_SERVICE_PATH = {
  overview: `${HR_SELF_SERVICE_BASE}/overview`,
  home: `${HR_SELF_SERVICE_BASE}/home`,
  school: `${HR_SELF_SERVICE_BASE}/school`,
  payments: `${HR_SELF_SERVICE_BASE}/payments`,
  requests: `${HR_SELF_SERVICE_BASE}/requests`,
  employment: `${HR_SELF_SERVICE_BASE}/employment`,
  timeOff: `${HR_SELF_SERVICE_BASE}/time-off`,
  /** @deprecated */
  leave: `${HR_SELF_SERVICE_BASE}/time-off?tab=leave`,
  /** @deprecated */
  attendance: `${HR_SELF_SERVICE_BASE}/time-off?tab=attendance`,
  loans: `${HR_SELF_SERVICE_BASE}/loans`,
  payslips: `${HR_SELF_SERVICE_BASE}/payslips`,
  documents: `${HR_SELF_SERVICE_BASE}/documents`,
  policies: `${HR_SELF_SERVICE_BASE}/policies`,
  grievance: `${HR_SELF_SERVICE_BASE}/grievance`,
  idCard: `${HR_SELF_SERVICE_BASE}/id-card`,
  benefits: `${HR_SELF_SERVICE_BASE}/benefits`,
  discipline: `${HR_SELF_SERVICE_BASE}/discipline`,
};

/** Account hub — overview, password, service shortcuts. */
export const ACCOUNT_PATH = {
  overview: '/me',
  account: '/me/account',
  services: '/me/services',
};

/** Legacy /me HR paths that redirect to HR_SELF_SERVICE_PATH equivalents. */
export const LEGACY_ME_HR_REDIRECTS = {
  '/me/leave': HR_SELF_SERVICE_PATH.timeOff + '?tab=leave',
  '/me/loans': HR_SELF_SERVICE_PATH.loans,
  '/me/documents': HR_SELF_SERVICE_PATH.documents,
  '/me/payslips': HR_SELF_SERVICE_PATH.payslips,
  '/me/employment': HR_SELF_SERVICE_PATH.employment,
  '/me/policies': HR_SELF_SERVICE_PATH.policies,
  '/me/grievance': HR_SELF_SERVICE_PATH.grievance,
  '/me/id-card': HR_SELF_SERVICE_PATH.idCard,
  '/me/attendance': HR_SELF_SERVICE_PATH.timeOff + '?tab=attendance',
  '/me/benefits': HR_SELF_SERVICE_PATH.benefits,
  '/me/discipline': HR_SELF_SERVICE_PATH.discipline,
  '/me/school': HR_SELF_SERVICE_PATH.school,
  '/me/payments': HR_SELF_SERVICE_PATH.payments,
};

/**
 * @param {string} tabId — profile completeness section id
 * @returns {string}
 */
export function hrSelfServicePathForTab(tabId, { openForm = false } = {}) {
  const map = {
    documents: HR_SELF_SERVICE_PATH.documents,
    employment: HR_SELF_SERVICE_PATH.employment,
    policies: HR_SELF_SERVICE_PATH.policies,
    school: HR_SELF_SERVICE_PATH.school,
  };
  const path = map[tabId] || HR_SELF_SERVICE_PATH.documents;
  if (openForm && tabId === 'employment') return `${path}?form=1`;
  return path;
}
