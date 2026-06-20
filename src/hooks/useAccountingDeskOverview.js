import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

/**
 * Cached Accounting Desk overview — single API call replaces 5+ parallel heavy requests.
 * @param {{ periodKey: string; deskRefresh?: number; enabled?: boolean }} opts
 */
export function useAccountingDeskOverview({ periodKey, deskRefresh = 0, enabled = true }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled || !periodKey) {
      setOverview(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(
        `/api/finance/desk-overview?period=${encodeURIComponent(periodKey)}`
      );
      if (!res.ok || !res.data?.ok) {
        setOverview(null);
        setError(res.data?.error || 'Could not load accounting overview.');
        return;
      }
      setOverview(res.data);
    } finally {
      setLoading(false);
    }
  }, [enabled, periodKey]);

  useEffect(() => {
    load();
  }, [load, deskRefresh]);

  return { overview, loading, error, reload: load };
}
