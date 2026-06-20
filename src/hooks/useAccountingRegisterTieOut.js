import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { tieOutChecksForRegister } from '../lib/accountingRegisterTieOut';

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

  const load = useCallback(async () => {
    if (!enabled || !periodKey) return;
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
      setThresholdPct(res.data.thresholdPct ?? null);
      setChecks(tieOutChecksForRegister(registerKind, res.data.checks));
    } finally {
      setLoading(false);
    }
  }, [enabled, periodKey, branchId, registerKind]);

  useEffect(() => {
    load();
  }, [load, deskRefresh]);

  return { checks, thresholdPct, loading, error, reload: load };
}
