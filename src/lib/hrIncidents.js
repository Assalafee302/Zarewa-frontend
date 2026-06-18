import { apiFetch, apiUrl } from './apiBase';

export function fetchDailyRoll(branchId, dayIso) {
  const q = new URLSearchParams();
  if (branchId) q.set('branchId', branchId);
  if (dayIso) q.set('dayIso', dayIso);
  return apiFetch(`/api/hr/attendance/daily-roll?${q}`);
}

export function fetchPerformanceRecognitions(filters = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const qs = q.toString();
  return apiFetch(`/api/hr/performance-recognitions${qs ? `?${qs}` : ''}`);
}

export function splitResponsibilityEvenly(parties) {
  const rows = Array.isArray(parties) ? [...parties] : [];
  const activeIndices = rows
    .map((p, i) => (String(p.userId || '').trim() ? i : -1))
    .filter((i) => i >= 0);
  const count = activeIndices.length;
  if (!count) return rows;
  const base = Math.floor((10000 / count)) / 100;
  const remainder = Math.round((100 - base * count) * 100) / 100;
  return rows.map((p, idx) => {
    if (!String(p.userId || '').trim()) return p;
    const pos = activeIndices.indexOf(idx);
    return { ...p, responsibilityWeight: pos === 0 ? base + remainder : base };
  });
}

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

/** @param {string} registryId */
export async function downloadIncidentAuditPdf(registryId) {
  const r = await fetch(apiUrl(`/api/incidents/${encodeURIComponent(registryId)}/audit-full/pdf`), {
    credentials: 'include',
  });
  if (!r.ok) {
    let err = 'PDF download failed.';
    try {
      const j = await r.json();
      err = j?.error || err;
    } catch {
      /* ignore */
    }
    return { ok: false, error: err };
  }
  const blob = await r.blob();
  const filename =
    r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ||
    `investigation-${registryId}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
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

export function settleRecoverySchedule(scheduleId, body = {}) {
  return apiFetch(`/api/hr/recovery-schedules/${encodeURIComponent(scheduleId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'settle', ...body }),
  });
}

export function recordCustodyEvent(body) {
  return apiFetch('/api/assets/custody-events', { method: 'POST', body: JSON.stringify(body) });
}

export function recordGatePassEvent(body) {
  return apiFetch('/api/security/gate-pass-events', { method: 'POST', body: JSON.stringify(body) });
}

export const INCIDENT_CATEGORIES = [
  { value: 'hr', label: 'HR discipline case' },
  { value: 'operational', label: 'Operational / asset incident' },
  { value: 'material', label: 'Material exception (coil/offcut)' },
  { value: 'performance', label: 'Performance recognition (not discipline)' },
];

export const OPERATIONAL_INCIDENT_TYPES = [
  { value: 'missing_asset', label: 'Missing asset / asset loss' },
  { value: 'unauthorized_movement', label: 'Unauthorized movement' },
  { value: 'custody_breach', label: 'Custody breach' },
  { value: 'damage', label: 'Property damage' },
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
