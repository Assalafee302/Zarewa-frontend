import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { tieOutChecksForRegister } from '../lib/accountingRegisterTieOut';
import {
  getAccountingDeskCache,
  invalidateAccountingDeskCache,
  setAccountingDeskCache,
} from '../lib/accountingDeskCache';

/**
 * @param {{
 *   registerKind: 'creditor' | 'debtor' | 'assets';
 *   periodKey?: string;
 *   branchId?: string | null;
 *   enabled?: boolean;
 *   deskRefresh?: number;
 * }} opts
 */
export function useAccountingRegisterTieOut({
  registerKind,
  periodKey,
  branchId,
  enabled = true,
  deskRefresh = 0,
}) {
  const [checks, setChecks] = useState([]);
  const [thresholdPct, setThresholdPct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastRefreshRef = useRef(-1);

  const load = useCallback(
    async (force = false) => {
      if (!enabled || !periodKey) return;
      const branchKey = branchId && branchId !== 'ALL' ? String(branchId) : 'ALL';
      const cacheKey = `tie-out|${periodKey}|${branchKey}`;
      if (!force) {
        const cached = getAccountingDeskCache(cacheKey);
        if (cached) {
          setThresholdPct(cached.thresholdPct ?? null);
          setChecks(tieOutChecksForRegister(registerKind, cached.checks));
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
        const params = new URLSearchParams({ period: periodKey });
        if (branchId && branchId !== 'ALL') params.set('branchId', branchId);
        else params.set('branchId', 'ALL');
        const res = await apiFetch(`/api/finance/control-tie-out?${params.toString()}`);
        if (!res.ok || !res.data?.ok) {
          setError(res.data?.error || 'Could not load tie-out.');
          setChecks([]);
          return;
        }
        setAccountingDeskCache(cacheKey, res.data);
        setThresholdPct(res.data.thresholdPct ?? null);
        setChecks(tieOutChecksForRegister(registerKind, res.data.checks));
      } finally {
        setLoading(false);
      }
    },
    [enabled, periodKey, branchId, registerKind]
  );

  useEffect(() => {
    const force = deskRefresh !== lastRefreshRef.current;
    lastRefreshRef.current = deskRefresh;
    void load(force);
  }, [load, deskRefresh]);

  return { checks, thresholdPct, loading, error, reload: () => load(true) };
}
