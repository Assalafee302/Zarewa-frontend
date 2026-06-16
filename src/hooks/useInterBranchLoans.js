import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

/**
 * @param {{ enabled?: boolean }} [opts]
 */
export function useInterBranchLoans(opts = {}) {
  const { enabled = true } = opts;
  const [loans, setLoans] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    const { ok, data } = await apiFetch('/api/inter-branch-loans');
    setLoading(false);
    if (!ok || !data?.ok) {
      setLoans([]);
      setBalances([]);
      setError(data?.error || 'Could not load inter-branch transfers.');
      return;
    }
    setLoans(data.loans || []);
    setBalances(data.balances || []);
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loans, balances, loading, error, reload: load };
}
