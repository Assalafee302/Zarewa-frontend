import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load HR API data without tying to workspace `refreshEpoch` (bootstrap poll ~30s).
 * Keeps list tables mounted after the first load (stale-while-revalidate).
 *
 * `loader` should return `{ error?: string, hasData?: boolean }` (hasData defaults true on success).
 */
export function useHrListLoad(loader, deps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasDataRef = useRef(false);
  const genRef = useRef(0);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    hasDataRef.current = false;
  }, [depsKey]);

  const reload = useCallback(
    async (opts = {}) => {
      const forceSpinner = opts.forceSpinner === true;
      const gen = ++genRef.current;
      if (forceSpinner || !hasDataRef.current) setLoading(true);
      setError('');
      let outcome = {};
      try {
        outcome = (await loader()) || {};
      } catch (e) {
        outcome = { error: String(e?.message || e), hasData: false };
      }
      if (gen !== genRef.current) return outcome;
      if (outcome.error) {
        setError(outcome.error);
        if (outcome.hasData === false) hasDataRef.current = false;
      } else if (outcome.hasData !== false) {
        hasDataRef.current = true;
      }
      setLoading(false);
      return outcome;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo -- explicit deps from caller
    deps
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, setError, reload };
}
