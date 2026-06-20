import { apiFetch, apiUrl } from './apiBase';

export function fetchObligationAccounts(params = {}) {
  const q = new URLSearchParams();
  if (params.userId) q.set('userId', params.userId);
  if (params.kind) q.set('kind', params.kind);
  const qs = q.toString();
  return apiFetch(`/api/hr/obligation-accounts${qs ? `?${qs}` : ''}`);
}

export function fetchObligationAccountDetail(accountId) {
  return apiFetch(`/api/hr/obligation-accounts/${encodeURIComponent(accountId)}`);
}

export function migrateLegacyStaffLoan(body) {
  return apiFetch('/api/hr/obligation-accounts/migrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function recordObligationRepayment(accountId, body) {
  return apiFetch(`/api/hr/obligation-accounts/${encodeURIComponent(accountId)}/repayments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fetchStaffMoneySummary(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/money-summary`);
}

export function obligationStatementPdfUrl(accountId) {
  return apiUrl(`/api/hr/obligation-accounts/${encodeURIComponent(accountId)}/statement.pdf`);
}

export function obligationDisbursementVoucherPdfUrl(accountId) {
  return apiUrl(`/api/hr/obligation-accounts/${encodeURIComponent(accountId)}/disbursement-voucher.pdf`);
}

export function obligationRepaymentReceiptPdfUrl(accountId, transactionId) {
  return apiUrl(
    `/api/hr/obligation-accounts/${encodeURIComponent(accountId)}/transactions/${encodeURIComponent(transactionId)}/receipt.pdf`
  );
}

export function backfillRecoveryObligations() {
  return apiFetch('/api/hr/obligation-accounts/backfill-recoveries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export function patchObligationDeductionPause(accountId, body) {
  return apiFetch(`/api/hr/obligation-accounts/${encodeURIComponent(accountId)}/pause`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function maintainObligationAccount(accountId, body) {
  return apiFetch(`/api/hr/obligation-accounts/${encodeURIComponent(accountId)}/maintenance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function chairmanWaiveObligation(accountId, body) {
  return apiFetch(`/api/hr/obligation-accounts/${encodeURIComponent(accountId)}/chairman-waive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
