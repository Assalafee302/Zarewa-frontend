import { apiFetch } from './apiBase';

export function fetchHrEngagementSurveys() {
  return apiFetch('/api/hr/engagement/surveys');
}

export function createHrEngagementSurvey(body) {
  return apiFetch('/api/hr/engagement/surveys', { method: 'POST', body: JSON.stringify(body) });
}

export function patchHrEngagementSurvey(surveyId, body) {
  return apiFetch(`/api/hr/engagement/surveys/${encodeURIComponent(surveyId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchHrEngagementSummary(surveyId) {
  return apiFetch(`/api/hr/engagement/surveys/${encodeURIComponent(surveyId)}/summary`);
}

export function fetchOpenEngagementSurveys() {
  return apiFetch('/api/hr/engagement/open');
}

export function submitEngagementResponse(body) {
  return apiFetch('/api/hr/engagement/responses', { method: 'POST', body: JSON.stringify(body) });
}
