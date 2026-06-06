import { apiFetch } from './apiBase';

export async function fetchChairmanSchoolFees() {
  const r = await apiFetch('/api/hr/chairman/school-fees');
  return r.data?.fees || [];
}
export async function saveChairmanSchoolFee(data) {
  if (data.id) return apiFetch(`/api/hr/chairman/school-fees/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
  return apiFetch('/api/hr/chairman/school-fees', { method: 'POST', body: JSON.stringify(data) });
}
export async function deleteChairmanSchoolFeeApi(id) {
  return apiFetch(`/api/hr/chairman/school-fees/${id}`, { method: 'DELETE' });
}
export async function fetchChairmanExpenses(period) {
  const url = period ? `/api/hr/chairman/expenses?period=${period}` : '/api/hr/chairman/expenses';
  const r = await apiFetch(url);
  return r.data?.expenses || [];
}
export async function saveChairmanExpense(data) {
  if (data.id) return apiFetch(`/api/hr/chairman/expenses/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
  return apiFetch('/api/hr/chairman/expenses', { method: 'POST', body: JSON.stringify(data) });
}
export async function deleteChairmanExpenseApi(id) {
  return apiFetch(`/api/hr/chairman/expenses/${id}`, { method: 'DELETE' });
}
