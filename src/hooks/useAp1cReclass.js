import { useCallback, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

/** AP1c-5 reclass preview and post. */
export function useAp1cReclass(opts = {}) {
  const { enabled = true } = opts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (branchId = null) => {
      if (!enabled) return;
      setLoading(true);
      setError('');
      const qs = branchId && branchId !== 'ALL' ? `?branchId=${encodeURIComponent(branchId)}` : '';
      const res = await apiFetch(`/api/finance/ap1c-reclass-preview${qs}`);
      setLoading(false);
      if (!res.ok || !res.data?.ok) {
        setError(res.data?.error || 'Could not load reclass preview.');
        return;
      }
      setData(res.data);
    },
    [enabled]
  );

  const post = useCallback(async (branchId = null) => {
    const res = await apiFetch('/api/finance/ap1c-reclass', {
      method: 'POST',
      body: JSON.stringify({ branchId: branchId && branchId !== 'ALL' ? branchId : undefined }),
    });
    return res;
  }, []);

  return { data, loading, error, load, post };
};
