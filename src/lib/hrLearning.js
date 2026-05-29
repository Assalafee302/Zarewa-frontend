import { apiFetch } from './apiBase';

export function fetchHrTrainingRecords(userId) {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return apiFetch(`/api/hr/training-records${q}`);
}

export function createHrTrainingRecord(body) {
  return apiFetch('/api/hr/training-records', { method: 'POST', body: JSON.stringify(body) });
}

export function deleteHrTrainingRecord(recordId) {
  return apiFetch(`/api/hr/training-records/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
}
