import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import {
  getAccountingDeskCache,
  invalidateAccountingDeskCache,
  setAccountingDeskCache,
} from '../lib/accountingDeskCache';

/**
 * Cached Accounting Desk overview — single API call replaces 5+ parallel heavy requests.
 * @param {{ periodKey: string; deskRefresh?: number; enabled?: boolean }} opts
 */
export function useAccountingDeskOverview({ periodKey, deskRefresh = 0, enabled = true }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastRefreshRef = useRef(-1);

  const load = useCallback(
    async (force = false) => {
      if (!enabled || !periodKey) {
        setOverview(null);
        setError('');
        return;
      }
      const cacheKey = `desk-overview|${periodKey}`;
      if (!force) {
        const cached = getAccountingDeskCache(cacheKey);
        if (cached) {
          setOverview(cached);
          setError('');
          setLoading(false);
          return;
        }
      } else {
        invalidateAccountingDeskCache(cacheKey);
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
        setAccountingDeskCache(cacheKey, res.data);
        setOverview(res.data);
      } finally {
        setLoading(false);
      }
    },
    [enabled, periodKey]
  );

  useEffect(() => {
    const force = deskRefresh !== lastRefreshRef.current;
    lastRefreshRef.current = deskRefresh;
    void load(force);
  }, [load, deskRefresh]);

  return { overview, loading, error, reload: () => load(true) };
}
