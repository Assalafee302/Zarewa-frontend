import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

/**
 * @param {{ registerLineId?: string; branchId?: string | null; status?: string; enabled?: boolean }} [opts]
 */
export function useRegisterSettlements(opts = {}) {
  const { registerLineId, branchId, status, enabled = true } = opts;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (registerLineId) qs.set('registerLineId', registerLineId);
    else if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    if (status) qs.set('status', status);
    const path = qs.toString() ? `/api/accounting/settlements?${qs}` : '/api/accounting/settlements';
    const { ok, data } = await apiFetch(path);
    setLoading(false);
    if (!ok || !data?.ok) {
      setItems([]);
      setError(data?.error || 'Could not load settlements.');
      return;
    }
    setItems(data.items || []);
  }, [registerLineId, branchId, status, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, error, reload: load };
}

export function useRegisterSettlementMutations() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fetchAvailable = useCallback(async (lineId) => {
    const { ok, data } = await apiFetch(
      `/api/accounting/register-lines/${encodeURIComponent(lineId)}/settlement-capacity`
    );
    if (!ok || !data?.ok) {
      return { ok: false, availableNgn: 0, reservedNgn: 0, openNgn: 0, blockingItems: [], error: data?.error };
    }
    return {
      ok: true,
      availableNgn: data.availableNgn ?? 0,
      reservedNgn: data.reservedNgn ?? 0,
      openNgn: data.openNgn ?? 0,
      blockingItems: data.blockingItems || [],
    };
  }, []);

  const createSettlement = useCallback(async (lineId, body) => {
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch(
      `/api/accounting/register-lines/${encodeURIComponent(lineId)}/settlements`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not create settlement request.');
      return { ok: false };
    }
    return { ok: true, settlement: data.settlement };
  }, []);

  const decideSettlement = useCallback(async (settlementId, body) => {
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch(
      `/api/accounting/settlements/${encodeURIComponent(settlementId)}/decision`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not record decision.');
      return { ok: false };
    }
    return { ok: true, settlement: data.settlement };
  }, []);

  const paySettlement = useCallback(async (settlementId, body) => {
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch(
      `/api/accounting/settlements/${encodeURIComponent(settlementId)}/pay`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not pay settlement.');
      return { ok: false };
    }
    return { ok: true, settlement: data.settlement };
  }, []);

  return { busy, error, fetchAvailable, createSettlement, decideSettlement, paySettlement };
}
