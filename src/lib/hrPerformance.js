import { apiFetch } from './apiBase';

export function fetchHrAppraisalCycles() {
  return apiFetch('/api/hr/appraisal-cycles');
}

export function createHrAppraisalCycle(body) {
  return apiFetch('/api/hr/appraisal-cycles', { method: 'POST', body: JSON.stringify(body) });
}

export function fetchHrAppraisalForms(cycleId) {
  return apiFetch(`/api/hr/appraisal-cycles/${encodeURIComponent(cycleId)}/forms`);
}

export function saveHrAppraisalForm(body) {
  return apiFetch('/api/hr/appraisal-forms', { method: 'POST', body: JSON.stringify(body) });
}

export function fetchHrFeedbackNotes(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/feedback`);
}

export function createHrFeedbackNote(body) {
  return apiFetch('/api/hr/feedback', { method: 'POST', body: JSON.stringify(body) });
}

export const HR_APPRAISAL_CRITERIA = [
  { key: 'goals', label: 'Goals & delivery' },
  { key: 'conduct', label: 'Conduct & discipline' },
  { key: 'teamwork', label: 'Teamwork' },
  { key: 'overall', label: 'Overall rating' },
];

export function emptyAppraisalScores() {
  return { goals: 3, conduct: 3, teamwork: 3, overall: 3, comments: '' };
}

/** @param {unknown} raw */
export function parseAppraisalScores(raw) {
  if (!raw || typeof raw !== 'object') return emptyAppraisalScores();
  const s = /** @type {Record<string, unknown>} */ (raw);
  const num = (k) => {
    const n = Number(s[k]);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : 3;
  };
  return {
    goals: num('goals'),
    conduct: num('conduct'),
    teamwork: num('teamwork'),
    overall: num('overall'),
    comments: String(s.comments || '').slice(0, 4000),
  };
}
