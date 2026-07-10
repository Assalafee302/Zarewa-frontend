import { useCallback, useEffect, useState } from 'react';
import { fetchStockRegister } from '../components/reports/stockRegister/stockRegisterApi';
import { STATUS_STEPS } from '../components/reports/stockRegister/stockRegisterConstants';

export function stockStatusLooksReady(status) {
  return status === 'md_approved' || status === 'locked' || status === 'captured';
}

/** Lightweight stock register status for Reports hub (no full panel mount). */
export function useStockRegisterStatus(endDate, branchId) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!endDate || !branchId) {
      setStatus(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { ok, data } = await fetchStockRegister(endDate, 'finance');
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load stock register.');
        setStatus(null);
        return;
      }
      setStatus(data.workflow?.status || data.register?.status || 'draft');
    } catch {
      setError('Could not load stock register.');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [endDate, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const stepLabel = STATUS_STEPS.find((s) => s.key === status)?.label || status || '—';
  const ready = stockStatusLooksReady(status);

  return { loading, status, error, stepLabel, ready, reload: load };
}
