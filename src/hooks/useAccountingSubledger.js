import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

/**
 * @param {{ branchId?: string | null; enabled?: boolean }} [opts]
 */
export function useAccountingCreditors(opts = {}) {
  const { branchId = null, enabled = true } = opts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    const path = qs.toString() ? `/api/accounting/creditors?${qs}` : '/api/accounting/creditors';
    const { ok, data: d } = await apiFetch(path);
    setLoading(false);
    if (!ok || !d?.ok) {
      setData(null);
      setError(d?.error || 'Could not load creditors register.');
      return;
    }
    setData(d);
  }, [branchId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

/**
 * @param {{ branchId?: string | null; enabled?: boolean }} [opts]
 */
export function useAccountingDebtors(opts = {}) {
  const { branchId = null, enabled = true } = opts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    const path = qs.toString() ? `/api/accounting/debtors?${qs}` : '/api/accounting/debtors';
    const { ok, data: d } = await apiFetch(path);
    setLoading(false);
    if (!ok || !d?.ok) {
      setData(null);
      setError(d?.error || 'Could not load debtors register.');
      return;
    }
    setData(d);
  }, [branchId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

/**
 * @param {{ branchId?: string | null; enabled?: boolean }} [opts]
 */
export function useAccountingAssets(opts = {}) {
  const { branchId = null, enabled = true } = opts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    const path = qs.toString() ? `/api/accounting/assets?${qs}` : '/api/accounting/assets';
    const { ok, data: d } = await apiFetch(path);
    setLoading(false);
    if (!ok || !d?.ok) {
      setData(null);
      setError(d?.error || 'Could not load fixed assets register.');
      return;
    }
    setData(d);
  }, [branchId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

/**
 * @param {{ onDone?: () => void }} [opts]
 */
export function useAccountingRegisterMutations(opts = {}) {
  const { onDone } = opts;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const createLine = useCallback(
    async (body) => {
      setBusy(true);
      setError('');
      const { ok, data: d } = await apiFetch('/api/accounting/register-lines', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setBusy(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not save register line.');
        return { ok: false };
      }
      onDone?.();
      return { ok: true, line: d.line };
    },
    [onDone]
  );

  const updateLine = useCallback(
    async (lineId, body) => {
      setBusy(true);
      setError('');
      const { ok, data: d } = await apiFetch(
        `/api/accounting/register-lines/${encodeURIComponent(lineId)}`,
        { method: 'PATCH', body: JSON.stringify(body) }
      );
      setBusy(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not update register line.');
        return { ok: false };
      }
      onDone?.();
      return { ok: true, line: d.line };
    },
    [onDone]
  );

  const clearLine = useCallback(
    async (lineId) => {
      setBusy(true);
      setError('');
      const { ok, data: d } = await apiFetch(`/api/accounting/register-lines/${encodeURIComponent(lineId)}/clear`, {
        method: 'POST',
      });
      setBusy(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not clear register line.');
        return { ok: false };
      }
      onDone?.();
      return { ok: true };
    },
    [onDone]
  );

  const createAsset = useCallback(
    async (body) => {
      setBusy(true);
      setError('');
      const { ok, data: d } = await apiFetch('/api/accounting/assets', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setBusy(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not create asset.');
        return { ok: false };
      }
      onDone?.();
      return { ok: true, asset: d.asset };
    },
    [onDone]
  );

  const disposeAsset = useCallback(
    async (assetId, payload) => {
      setBusy(true);
      setError('');
      const body =
        typeof payload === 'string'
          ? { disposalDateIso: payload }
          : {
              disposalDateIso: payload?.disposalDateIso,
              saleProceedsNgn: payload?.saleProceedsNgn,
              treasuryAccountId: payload?.treasuryAccountId,
              reference: payload?.reference,
              note: payload?.note,
            };
      const { ok, data: d } = await apiFetch(
        `/api/accounting/assets/${encodeURIComponent(assetId)}/dispose`,
        { method: 'POST', body: JSON.stringify(body) }
      );
      setBusy(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not dispose asset.');
        return { ok: false };
      }
      onDone?.();
      return { ok: true, ...d };
    },
    [onDone]
  );

  return { busy, error, createLine, updateLine, clearLine, createAsset, disposeAsset };
}
