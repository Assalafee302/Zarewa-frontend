import { apiFetch } from './apiBase';

export function fetchHrJobs(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/api/hr/recruiting/jobs${q}`);
}

export function createHrJob(body) {
  return apiFetch('/api/hr/recruiting/jobs', { method: 'POST', body: JSON.stringify(body) });
}

export function patchHrJob(jobId, body) {
  return apiFetch(`/api/hr/recruiting/jobs/${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchHrApplicants(jobId) {
  return apiFetch(`/api/hr/recruiting/jobs/${encodeURIComponent(jobId)}/applicants`);
}

export function createHrApplicant(body) {
  return apiFetch('/api/hr/recruiting/applicants', { method: 'POST', body: JSON.stringify(body) });
}

export function patchHrApplicant(applicantId, body) {
  return apiFetch(`/api/hr/recruiting/applicants/${encodeURIComponent(applicantId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchApplicantPrefill(applicantId) {
  return apiFetch(`/api/hr/recruiting/applicants/${encodeURIComponent(applicantId)}/prefill`);
}

export const APPLICANT_STATUSES = [
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];
