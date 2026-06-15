import { apiFetch } from './apiBase';

export function fetchDisciplineCaseDashboard() {
  return apiFetch('/api/hr/discipline-cases/dashboard');
}

export function fetchDisciplineCases(filters = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const qs = q.toString();
  return apiFetch(`/api/hr/discipline-cases${qs ? `?${qs}` : ''}`);
}

export function fetchDisciplineCase(caseId) {
  return apiFetch(`/api/hr/discipline-cases/${encodeURIComponent(caseId)}`);
}

export function createDisciplineCase(body) {
  return apiFetch('/api/hr/discipline-cases', { method: 'POST', body: JSON.stringify(body) });
}

export function patchDisciplineCase(caseId, body) {
  return apiFetch(`/api/hr/discipline-cases/${encodeURIComponent(caseId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function addDisciplineCaseEvidence(caseId, body) {
  return apiFetch(`/api/hr/discipline-cases/${encodeURIComponent(caseId)}/evidence`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function addDisciplineCaseWitness(caseId, body) {
  return apiFetch(`/api/hr/discipline-cases/${encodeURIComponent(caseId)}/witnesses`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function generateDisciplineCaseLetter(caseId, letterType, extra = {}) {
  return apiFetch(
    `/api/hr/discipline-cases/${encodeURIComponent(caseId)}/letters/${encodeURIComponent(letterType)}`,
    { method: 'POST', body: JSON.stringify(extra) },
  );
}

export const DISCIPLINE_CASE_TYPES = [
  { value: 'query', label: 'Query' },
  { value: 'verbal_warning', label: 'Verbal warning' },
  { value: 'written_warning', label: 'Written warning' },
  { value: 'final_warning', label: 'Final warning' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'gross_misconduct', label: 'Gross misconduct' },
  { value: 'theft_fraud', label: 'Theft / fraud' },
  { value: 'negligence', label: 'Negligence' },
  { value: 'property_damage', label: 'Property damage' },
  { value: 'insubordination', label: 'Insubordination' },
  { value: 'confidentiality_breach', label: 'Confidentiality breach' },
  { value: 'performance_misconduct', label: 'Performance misconduct' },
  { value: 'absenteeism', label: 'Absenteeism' },
  { value: 'lateness', label: 'Lateness' },
  { value: 'harassment_complaint', label: 'Harassment complaint' },
  { value: 'policy_violation', label: 'Policy violation' },
  { value: 'dismissal_recommendation', label: 'Dismissal recommendation' },
];

export const DISCIPLINE_CASE_STATUSES = [
  { value: 'draft', label: 'Draft', tone: 'slate' },
  { value: 'open', label: 'Open', tone: 'amber' },
  { value: 'awaiting_employee_response', label: 'Awaiting response', tone: 'amber' },
  { value: 'under_investigation', label: 'Under investigation', tone: 'teal' },
  { value: 'awaiting_hr_review', label: 'HR review', tone: 'teal' },
  { value: 'awaiting_management_decision', label: 'Mgmt decision', tone: 'amber' },
  { value: 'action_issued', label: 'Action issued', tone: 'red' },
  { value: 'appealed', label: 'Appealed', tone: 'amber' },
  { value: 'closed', label: 'Closed', tone: 'emerald' },
  { value: 'cancelled', label: 'Cancelled', tone: 'slate' },
];

export const DISCIPLINE_SEVERITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function statusMeta(status) {
  return DISCIPLINE_CASE_STATUSES.find((s) => s.value === status) || { label: status, tone: 'slate' };
}

export function severityClass(severity) {
  if (severity === 'critical') return 'bg-red-100 text-red-800';
  if (severity === 'high') return 'bg-orange-100 text-orange-800';
  if (severity === 'medium') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}
