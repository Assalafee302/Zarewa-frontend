import { apiFetch } from './apiBase';

export function createIncident(body) {
  return apiFetch('/api/incidents', { method: 'POST', body: JSON.stringify(body) });
}

export function fetchIncidents(filters = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const qs = q.toString();
  return apiFetch(`/api/incidents${qs ? `?${qs}` : ''}`);
}

export function fetchIncident(registryId) {
  return apiFetch(`/api/incidents/${encodeURIComponent(registryId)}`);
}

export function fetchIncidentAuditFull(registryId) {
  return apiFetch(`/api/incidents/${encodeURIComponent(registryId)}/audit-full`);
}

export function fetchCaseResponsibility(caseId) {
  return apiFetch(`/api/hr/discipline-cases/${encodeURIComponent(caseId)}/responsibility`);
}

export function saveCaseResponsibility(caseId, parties) {
  return apiFetch(`/api/hr/discipline-cases/${encodeURIComponent(caseId)}/responsibility`, {
    method: 'PUT',
    body: JSON.stringify({ parties }),
  });
}

export function fetchCaseClosureCheck(caseId) {
  return apiFetch(`/api/hr/discipline-cases/${encodeURIComponent(caseId)}/closure-check`);
}

export function applyCaseDecision(caseId, body) {
  return apiFetch(`/api/hr/discipline-cases/${encodeURIComponent(caseId)}/apply-decision`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function createCaseRecoverySchedules(caseId, body = {}) {
  return apiFetch(`/api/hr/discipline-cases/${encodeURIComponent(caseId)}/recovery-schedules`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchCaseRecoverySchedules(caseId) {
  return apiFetch(`/api/hr/discipline-cases/${encodeURIComponent(caseId)}/recovery-schedules`);
}

export function recordCustodyEvent(body) {
  return apiFetch('/api/assets/custody-events', { method: 'POST', body: JSON.stringify(body) });
}

export function recordGatePassEvent(body) {
  return apiFetch('/api/security/gate-pass-events', { method: 'POST', body: JSON.stringify(body) });
}

export const INCIDENT_CATEGORIES = [
  { value: 'hr', label: 'HR discipline case' },
  { value: 'material', label: 'Material exception (coil/offcut)' },
  { value: 'operational', label: 'Operational / asset incident' },
];

export const DECISION_TYPE_OPTIONS = [
  { value: 'warning', label: 'Warning' },
  { value: 'deduction', label: 'Salary deduction / recovery' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'termination', label: 'Termination' },
  { value: 'no_action', label: 'No action' },
];

export const RESPONSIBILITY_ROLES = [
  { value: 'custodian', label: 'Custodian' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'security', label: 'Security' },
  { value: 'operator', label: 'Operator' },
  { value: 'approver', label: 'Approver' },
  { value: 'other', label: 'Other' },
];

export const CONTRIBUTION_TYPES = [
  { value: 'action', label: 'Action' },
  { value: 'omission', label: 'Omission' },
  { value: 'negligence', label: 'Negligence' },
];
