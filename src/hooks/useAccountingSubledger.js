import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import {
  getAccountingDeskCache,
  invalidateAccountingDeskCache,
  setAccountingDeskCache,
} from '../lib/accountingDeskCache';
import { snapshotRegisterMatches } from '../lib/accountingRegisterSnapshot';

function branchCacheKey(branchId) {
  const b = branchId && branchId !== 'ALL' ? String(branchId) : 'ALL';
  return b;
}

async function fetchRegisterFallback(path, cacheKey, force) {
  if (!force) {
    const cached = getAccountingDeskCache(cacheKey);
    if (cached) return { ok: true, data: cached };
  } else {
    invalidateAccountingDeskCache(cacheKey);
  }
  const { ok, data: d } = await apiFetch(path);
  if (ok && d?.ok) setAccountingDeskCache(cacheKey, d);
  return { ok, data: d };
}

/**
 * @param {{
 *   snapshotKey: 'accountingCreditors' | 'accountingDebtors' | 'accountingAssets';
 *   apiPath: string;
 *   cachePrefix: string;
 *   branchId?: string | null;
 *   enabled?: boolean;
 *   deskRefresh?: number;
 *   emptyError: string;
 * }} config
 */
function useAccountingRegisterFromSnapshot(config) {
  const {
    snapshotKey,
    apiPath,
    cachePrefix,
    branchId = null,
    enabled = true,
    deskRefresh = 0,
    emptyError,
  } = config;
  const ws = useWorkspace();
  const lastRefreshRef = useRef(-1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const snapshotPack = useMemo(() => {
    void ws?.refreshEpoch;
    const pack = ws?.snapshot?.[snapshotKey];
    if (snapshotRegisterMatches(pack, branchId, ws?.branchScope)) return pack;
    return null;
  }, [ws?.refreshEpoch, ws?.snapshot, snapshotKey, branchId, ws?.branchScope]);

  const load = useCallback(
    async (force = false) => {
      if (!enabled) return;

      let snap = ws?.snapshot;
      const needsFinanceLoad = force || !snap?.[snapshotKey]?.ok;
      if (needsFinanceLoad) {
        snap = (await ws?.ensureDomainLoaded?.('finance', { force: needsFinanceLoad })) || snap;
      }

      const livePack = snap?.[snapshotKey];
      if (snapshotRegisterMatches(livePack, branchId, snap?.branchScope ?? ws?.branchScope)) {
        setData(livePack);
        setError('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      const qs = new URLSearchParams();
      if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
      const path = qs.toString() ? `${apiPath}?${qs}` : apiPath;
      const cacheKey = `${cachePrefix}|${branchCacheKey(branchId)}`;
      const { ok, data: d } = await fetchRegisterFallback(path, cacheKey, force);
      setLoading(false);
      if (!ok || !d?.ok) {
        setData(null);
        setError(d?.error || emptyError);
        return;
      }
      setData(d);
    },
    [enabled, ws, snapshotKey, branchId, apiPath, cachePrefix, emptyError]
  );

  useEffect(() => {
    if (snapshotPack) {
      setData(snapshotPack);
      setError('');
      setLoading(false);
    }
  }, [snapshotPack]);

  useEffect(() => {
    if (!enabled) return;
    const force = deskRefresh !== lastRefreshRef.current;
    lastRefreshRef.current = deskRefresh;
    if (force || !snapshotPack) void load(force);
  }, [enabled, load, deskRefresh, snapshotPack]);

  return { data, loading: loading && !data, error, reload: () => load(true) };
}

/**
 * @param {{ branchId?: string | null; enabled?: boolean; deskRefresh?: number }} [opts]
 */
export function useAccountingCreditors(opts = {}) {
  const { branchId = null, enabled = true, deskRefresh = 0 } = opts;
  return useAccountingRegisterFromSnapshot({
    snapshotKey: 'accountingCreditors',
    apiPath: '/api/accounting/creditors',
    cachePrefix: 'creditors',
    branchId,
    enabled,
    deskRefresh,
    emptyError: 'Could not load creditors register.',
  });
}

/**
 * @param {{ branchId?: string | null; enabled?: boolean; deskRefresh?: number }} [opts]
 */
export function useAccountingDebtors(opts = {}) {
  const { branchId = null, enabled = true, deskRefresh = 0 } = opts;
  return useAccountingRegisterFromSnapshot({
    snapshotKey: 'accountingDebtors',
    apiPath: '/api/accounting/debtors',
    cachePrefix: 'debtors',
    branchId,
    enabled,
    deskRefresh,
    emptyError: 'Could not load debtors register.',
  });
}

/**
 * @param {{ branchId?: string | null; enabled?: boolean; deskRefresh?: number }} [opts]
 */
export function useAccountingAssets(opts = {}) {
  const { branchId = null, enabled = true, deskRefresh = 0 } = opts;
  return useAccountingRegisterFromSnapshot({
    snapshotKey: 'accountingAssets',
    apiPath: '/api/accounting/assets',
    cachePrefix: 'assets',
    branchId,
    enabled,
    deskRefresh,
    emptyError: 'Could not load fixed assets register.',
  });
}

/**
 * @param {{ onDone?: () => void }} [opts]
 */
export function useAccountingRegisterMutations(opts = {}) {
  const { onDone } = opts;
  const ws = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const afterMutation = useCallback(async () => {
    await ws?.ensureDomainLoaded?.('finance', { force: true });
    onDone?.();
  }, [onDone, ws]);

  const createLine = useCallback(
    async (body) => {
      setBusy(true);
      setError('');
      const { ok, data: d } = await apiFetch('/api/accounting/register-lines', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setBusy(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not save register line.');
        return { ok: false };
      }
      await afterMutation();
      return { ok: true, line: d.line };
    },
    [afterMutation]
  );

  const updateLine = useCallback(
    async (lineId, body) => {
      setBusy(true);
      setError('');
      const { ok, data: d } = await apiFetch(
        `/api/accounting/register-lines/${encodeURIComponent(lineId)}`,
        { method: 'PATCH', body: JSON.stringify(body) }
      );
      setBusy(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not update register line.');
        return { ok: false };
      }
      await afterMutation();
      return { ok: true, line: d.line };
    },
    [afterMutation]
  );

  const clearLine = useCallback(
    async (lineId) => {
      setBusy(true);
      setError('');
      const { ok, data: d } = await apiFetch(`/api/accounting/register-lines/${encodeURIComponent(lineId)}/clear`, {
        method: 'POST',
      });
      setBusy(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not clear register line.');
        return { ok: false };
      }
      await afterMutation();
      return { ok: true };
    },
    [afterMutation]
  );

  const createAsset = useCallback(
    async (body) => {
      setBusy(true);
      setError('');
      const { ok, data: d } = await apiFetch('/api/accounting/assets', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setBusy(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not create asset.');
        return { ok: false };
      }
      await afterMutation();
      return { ok: true, asset: d.asset };
    },
    [afterMutation]
  );

  const disposeAsset = useCallback(
    async (assetId, payload) => {
      setBusy(true);
      setError('');
      const body =
        typeof payload === 'string'
          ? { disposalDateIso: payload }
          : {
              disposalDateIso: payload?.disposalDateIso,
              saleProceedsNgn: payload?.saleProceedsNgn,
              treasuryAccountId: payload?.treasuryAccountId,
              reference: payload?.reference,
              note: payload?.note,
            };
      const { ok, data: d } = await apiFetch(
        `/api/accounting/assets/${encodeURIComponent(assetId)}/dispose`,
        { method: 'POST', body: JSON.stringify(body) }
      );
      setBusy(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not dispose asset.');
        return { ok: false };
      }
      await afterMutation();
      return { ok: true, ...d };
    },
    [afterMutation]
  );

  return { busy, error, createLine, updateLine, clearLine, createAsset, disposeAsset };
}
