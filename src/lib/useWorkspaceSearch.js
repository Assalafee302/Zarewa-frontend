import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from './apiBase';
import { searchWorkspaceSnapshot } from './workspaceSearchLocal';

/**
 * Debounced workspace search with AbortController and offline snapshot fallback.
 * @param {object} opts
 * @param {string} opts.query
 * @param {boolean} [opts.apiOnline]
 * @param {object} [opts.snapshot]
 * @param {(p: string) => boolean} opts.hasPermission
 * @param {(m: string) => boolean} [opts.canAccessModule]
 * @param {string} [opts.roleKey]
 * @param {string} [opts.contextPath] — defaults to current route pathname
 * @param {number} [opts.limit]
 * @param {number} [opts.debounceMs]
 */
export function useWorkspaceSearch({
  query,
  apiOnline = true,
  snapshot,
  hasPermission,
  canAccessModule,
  roleKey,
  contextPath,
  limit = 18,
  debounceMs = 240,
}) {
  const location = useLocation();
  const routeContext = contextPath ?? location.pathname;
  const [hits, setHits] = useState([]);
  const [busy, setBusy] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef(null);
  const reqGenRef = useRef(0);
  const hasPermissionRef = useRef(hasPermission);
  const canAccessModuleRef = useRef(canAccessModule);

  useEffect(() => {
    hasPermissionRef.current = hasPermission;
    canAccessModuleRef.current = canAccessModule;
  }, [hasPermission, canAccessModule]);

  useEffect(() => {
    const q = String(query || '').trim();
    if (abortRef.current) abortRef.current.abort();

    if (q.length < 2) {
      setHits((prev) => (prev.length ? [] : prev));
      setBusy((prev) => (prev ? false : prev));
      setFromCache((prev) => (prev ? false : prev));
      return undefined;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const gen = ++reqGenRef.current;
    const ctx = encodeURIComponent(routeContext || '/');

    const timer = window.setTimeout(async () => {
      if (apiOnline) {
        setFromCache(false);
        setBusy(true);
        try {
          const { ok, data } = await apiFetch(
            `/api/workspace/search?q=${encodeURIComponent(q)}&limit=${limit}&ctx=${ctx}`,
            { signal: controller.signal }
          );
          if (controller.signal.aborted || gen !== reqGenRef.current) return;
          setBusy(false);
          if (ok && data?.ok && Array.isArray(data.results)) {
            setHits(data.results);
            return;
          }
        } catch (err) {
          if (controller.signal.aborted || gen !== reqGenRef.current) return;
          if (err?.name === 'AbortError') return;
        }
      }

      if (controller.signal.aborted || gen !== reqGenRef.current) return;
      setBusy(false);
      setFromCache(true);
      setHits(
        searchWorkspaceSnapshot(snapshot, q, hasPermissionRef.current, limit, {
          roleKey,
          canAccessModule: canAccessModuleRef.current,
          contextPath: routeContext,
        })
      );
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, apiOnline, snapshot, roleKey, routeContext, limit, debounceMs]);

  return { hits, busy, fromCache };
}
