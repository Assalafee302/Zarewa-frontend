import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

/**
 * Server-side paginated desk list (limit/offset). Merges pages for infinite scroll UIs.
 * @param {string} path e.g. `/api/sales-receipts`
 * @param {{ enabled?: boolean; pageSize?: number; itemsKey?: string; query?: Record<string, string|number|undefined|null> }} [opts]
 */
export function usePaginatedWorkspaceList(path, opts = {}) {
  const enabled = opts.enabled !== false;
  const pageSize = Math.max(20, Math.min(5000, Number(opts.pageSize) || 200));
  const itemsKey = String(opts.itemsKey || 'items');
  const query = opts.query && typeof opts.query === 'object' ? opts.query : {};
  const queryKey = Object.entries(query)
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `${k}=${String(v).trim()}`)
    .sort()
    .join('&');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const offsetRef = useRef(0);
  const pathRef = useRef(path);
  pathRef.current = path;

  const buildUrl = useCallback(
    (offset) => {
      const q = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
      for (const [key, value] of Object.entries(query)) {
        if (value == null || String(value).trim() === '') continue;
        q.set(key, String(value).trim());
      }
      const base = pathRef.current || '';
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}${q.toString()}`;
    },
    [pageSize, queryKey]
  );

  const reset = useCallback(async () => {
    if (!enabled || !pathRef.current) {
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError('');
    offsetRef.current = 0;
    try {
      const { ok, data } = await apiFetch(buildUrl(0));
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load list.');
        setItems([]);
        setTotal(0);
        return;
      }
      const page = Array.isArray(data[itemsKey])
        ? data[itemsKey]
        : Array.isArray(data.items)
          ? data.items
          : [];
      setItems(page);
      setTotal(Number(data.total) || page.length);
      offsetRef.current = page.length;
    } catch (e) {
      setError(String(e?.message || e || 'Could not load list.'));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [enabled, pageSize, itemsKey, buildUrl]);

  const loadMore = useCallback(async () => {
    if (!enabled || loading) return;
    if (items.length >= total && total > 0) return;
    setLoading(true);
    setError('');
    try {
      const { ok, data } = await apiFetch(buildUrl(offsetRef.current));
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load more.');
        return;
      }
      const page = Array.isArray(data[itemsKey])
        ? data[itemsKey]
        : Array.isArray(data.items)
          ? data.items
          : [];
      setItems((prev) => {
        const seen = new Set(prev.map((row) => String(row?.id || row?.refundID || row?.jobID || '')));
        const merged = [...prev];
        for (const row of page) {
          const id = String(row?.id || row?.refundID || row?.jobID || '');
          if (id && seen.has(id)) continue;
          if (id) seen.add(id);
          merged.push(row);
        }
        return merged;
      });
      offsetRef.current += page.length;
      if (data.total != null) setTotal(Number(data.total) || 0);
    } catch (e) {
      setError(String(e?.message || e || 'Could not load more.'));
    } finally {
      setLoading(false);
    }
  }, [enabled, loading, items.length, total, pageSize, itemsKey, buildUrl]);

  useEffect(() => {
    void reset();
  }, [reset, path, queryKey]);

  return {
    items,
    total,
    loading,
    error,
    hasMore: items.length < total,
    loadMore,
    reload: reset,
  };
}
