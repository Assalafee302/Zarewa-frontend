import { apiFetch } from './apiBase';

export async function fetchHrIdCards(userId) {
  const url = userId ? `/api/hr/id-cards?userId=${userId}` : '/api/hr/id-cards';
  const r = await apiFetch(url);
  return r.data?.requests || [];
}
export async function createHrIdCardRequest(data) {
  return apiFetch('/api/hr/id-cards', { method: 'POST', body: JSON.stringify(data) });
}
export async function patchHrIdCardRequest(id, data) {
  return apiFetch(`/api/hr/id-cards/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
