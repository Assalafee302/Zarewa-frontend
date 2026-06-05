import { useCallback, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

function buildQs(opts = {}) {
  const qs = new URLSearchParams();
  const branchId = opts.branchId ?? 'ALL';
  if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
  else qs.set('branchId', 'ALL');
  if (opts.period) qs.set('period', opts.period);
  if (opts.supplierId) qs.set('supplierId', opts.supplierId);
  if (opts.status) qs.set('status', opts.status);
  return qs;
}

/**
 * AP2c — supplier advance, inventory valuation, GL alignment reports.
 */
export function useAp2cReports(opts = {}) {
  const { enabled = true } = opts;
  const [advance, setAdvance] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [alignment, setAlignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAll = useCallback(
    async (filters = {}) => {
      if (!enabled) return;
      setLoading(true);
      setError('');
      const qs = buildQs(filters);
      const [a, i, g] = await Promise.all([
        apiFetch(`/api/finance/supplier-advance-report?${qs}`),
        apiFetch(`/api/finance/inventory-valuation-report?${qs}`),
        apiFetch(`/api/finance/ap-inventory-gl-alignment?${qs}`),
      ]);
      setLoading(false);
      if (!a.ok || !a.data?.ok) {
        setError(a.data?.error || 'Could not load supplier advance report.');
        return;
      }
      setAdvance(a.data);
      setInventory(i.ok && i.data?.ok ? i.data : null);
      setAlignment(g.ok && g.data?.ok ? g.data : null);
    },
    [enabled]
  );

  return { advance, inventory, alignment, loading, error, loadAll };
}
