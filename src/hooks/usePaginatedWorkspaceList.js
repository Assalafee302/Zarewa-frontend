import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from './apiBase';

/**
 * Server-side paginated desk list (limit/offset). Merges pages for infinite scroll UIs.
 * @param {string} path e.g. `/api/sales-receipts`
 * @param {{ enabled?: boolean; pageSize?: number; itemsKey?: string }} [opts]
 */
export function usePaginatedWorkspaceList(path, opts = {}) {
  const enabled = opts.enabled !== false;
  const pageSize = Math.max(20, Math.min(5000, Number(opts.pageSize) || 200));
  const itemsKey = String(opts.itemsKey || 'items');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const offsetRef = useRef(0);
  const pathRef = useRef(path);
  pathRef.current = path;

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
      const q = new URLSearchParams({ limit: String(pageSize), offset: '0' });
      const { ok, data } = await apiFetch(`${pathRef.current}?${q.toString()}`);
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
  }, [enabled, pageSize, itemsKey]);

  const loadMore = useCallback(async () => {
    if (!enabled || loading) return;
    if (items.length >= total && total > 0) return;
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offsetRef.current),
      });
      const { ok, data } = await apiFetch(`${pathRef.current}?${q.toString()}`);
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load more.');
        return;
      }
      const page = Array.isArray(data[itemsKey])
        ? data[itemsKey]
        : Array.isArray(data.items)
          ? data.items
          : [];
      setItems((prev) => [...prev, ...page]);
      offsetRef.current += page.length;
      if (data.total != null) setTotal(Number(data.total) || 0);
    } catch (e) {
      setError(String(e?.message || e || 'Could not load more.'));
    } finally {
      setLoading(false);
    }
  }, [enabled, loading, items.length, total, pageSize, itemsKey]);

  useEffect(() => {
    void reset();
  }, [reset, path]);

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
