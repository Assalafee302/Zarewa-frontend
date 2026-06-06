import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * URL-synced tab state (?tab=...) for consolidated HR hub pages.
 * @param {string} defaultTab
 * @param {string[]} validTabs
 */
export function useHrUrlTab(defaultTab, validTabs = []) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab') || defaultTab;
  const tab = validTabs.length && !validTabs.includes(raw) ? defaultTab : raw;

  const setTab = useCallback(
    (nextTab, extraParams = {}) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', nextTab);
        for (const [key, value] of Object.entries(extraParams)) {
          if (value == null || value === '') next.delete(key);
          else next.set(key, String(value));
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const extra = useMemo(() => {
    const out = {};
    searchParams.forEach((value, key) => {
      if (key !== 'tab') out[key] = value;
    });
    return out;
  }, [searchParams]);

  return { tab, setTab, searchParams, setSearchParams, extra };
}
