import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

/**
 * @param {{ branchId?: string | null; status?: string; enabled?: boolean }} [opts]
 */
export function useCreditExceptions(opts = {}) {
  const { branchId = null, status = '', enabled = true } = opts;
  const [items, setItems] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    if (status) qs.set('status', status);
    const path = qs.toString() ? `/api/credit-exceptions?${qs}` : '/api/credit-exceptions';
    const { ok, data: d } = await apiFetch(path);
    setLoading(false);
    if (!ok || !d?.ok) {
      setItems([]);
      setPolicy(null);
      setError(d?.error || 'Could not load credit exceptions.');
      return;
    }
    setItems(Array.isArray(d.creditExceptions) ? d.creditExceptions : []);
    setPolicy(d.policy || null);
  }, [branchId, status, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, policy, loading, error, reload: load };
}

export async function fetchQuotationCreditStatus(quotationId) {
  const { ok, data } = await apiFetch(`/api/quotations/${encodeURIComponent(quotationId)}/credit-status`);
  if (!ok || !data?.ok) return { ok: false, error: data?.error || 'Failed' };
  return { ok: true, ...data };
}

export async function submitCreditExceptionRequest(body) {
  const { ok, data } = await apiFetch('/api/credit-exceptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: ok && data?.ok, data, error: data?.error };
}

export async function postCreditExceptionDecision(id, decision, body = {}) {
  const { ok, data } = await apiFetch(`/api/credit-exceptions/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, decision }),
  });
  return { ok: ok && data?.ok, data, error: data?.error };
}

export async function revokeCreditExceptionApi(id, body = {}) {
  const { ok, data } = await apiFetch(`/api/credit-exceptions/${encodeURIComponent(id)}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: ok && data?.ok, data, error: data?.error };
}
