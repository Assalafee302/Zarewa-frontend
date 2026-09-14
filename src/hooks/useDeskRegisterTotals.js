import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

/**
 * True database totals for desk registers that still open from a capped recent snapshot.
 * A limit=1 page is enough — we only need `total`, not the rows.
 *
 * @param {boolean} enabled
 * @param {Array<{ key: string; path: string }>} registers
 */
export function useDeskRegisterTotals(enabled, registers) {
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const signature = registers.map((r) => `${r.key}:${r.path}`).join('|');

  useEffect(() => {
    if (!enabled || !registers.length) {
      setTotals({});
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      /** @type {Record<string, number>} */
      const next = {};
      await Promise.all(
        registers.map(async (register) => {
          try {
            const sep = register.path.includes('?') ? '&' : '?';
            const { ok, data } = await apiFetch(`${register.path}${sep}limit=1&offset=0`);
            if (ok && data?.ok && data.total != null) {
              next[register.key] = Math.max(0, Number(data.total) || 0);
            }
          } catch {
            // Totals are advisory — missing one must not blank the desk.
          }
        })
      );
      if (!cancelled) {
        setTotals(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, signature]);

  return { totals, loading };
}
