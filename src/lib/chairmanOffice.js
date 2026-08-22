import { apiFetch } from './apiBase';

export async function fetchChairmanOffice(filters = {}) {
  const q = new URLSearchParams();
  if (filters.asOfIso) q.set('asOfIso', filters.asOfIso);
  const suffix = q.toString() ? `?${q}` : '';
  const { ok, data } = await apiFetch(`/api/chairman/office${suffix}`);
  if (!ok || !data?.ok) throw new Error(data?.error || 'Could not load Chairman Office.');
  return data.office;
}

export async function requestChairmanWithdrawal(payload) {
  return apiFetch('/api/chairman/withdrawals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function requestChairmanOfficeLoan(payload) {
  return apiFetch('/api/chairman/loans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function recordChairmanOfficeLoanRepayment(loanId, payload) {
  return apiFetch(`/api/chairman/loans/${encodeURIComponent(loanId)}/repay`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
