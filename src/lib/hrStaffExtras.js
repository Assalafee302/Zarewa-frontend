import { apiFetch } from './apiBase';

export function fetchStaffSalaryHistory(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/salary-history`);
}

export function fetchStaffFeedback(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/feedback`);
}

export function createStaffFeedbackNote({ subjectUserId, body }) {
  return apiFetch('/api/hr/feedback', {
    method: 'POST',
    body: JSON.stringify({ subjectUserId, body }),
  });
}
