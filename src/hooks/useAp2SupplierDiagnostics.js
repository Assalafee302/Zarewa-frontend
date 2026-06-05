import { useCallback, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

/**
 * AP2a — load supplier / GRN / payables diagnostics on demand (read-only).
 * @param {{ branchId?: string | null, period?: string, supplierId?: string, status?: string, enabled?: boolean }} [opts]
 */
export function useAp2SupplierDiagnostics(opts = {}) {
  const { branchId = null, period = '', supplierId = '', status = '', enabled = true } = opts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    else if (branchId === 'ALL') qs.set('branchId', 'ALL');
    if (period) qs.set('period', period);
    if (supplierId) qs.set('supplierId', supplierId);
    if (status) qs.set('status', status);
    qs.set('limitSamples', '10');
    const path = `/api/finance/ap2-supplier-diagnostics?${qs.toString()}`;
    const { ok, data: d, status: httpStatus } = await apiFetch(path);
    setLoading(false);
    if (!ok || !d?.ok) {
      setData(null);
      if (httpStatus === 403) {
        setError('You do not have permission to view supplier payables diagnostics.');
      } else {
        setError(d?.error || 'Could not load supplier diagnostics.');
      }
      return;
    }
    setData(d);
  }, [branchId, period, supplierId, status, enabled]);

  return { data, loading, error, reload: load };
}
