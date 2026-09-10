/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, apiUrl } from '../lib/apiBase';
import {
  formatBootstrapConnectError,
  formatBootstrapNetworkError,
  isSpaHtmlResponse,
  probeDegradedApiHealth,
} from '../lib/bootstrapConnectError';
import {
  adaptiveBootstrapTimeoutMs,
  fetchWithTimeoutRetry,
  probeApiReachable,
} from '../lib/connectivityResilience';
import { replaceLedgerEntries } from '../lib/customerLedgerStore';
import {
  canAccessModuleWithPermissions,
  hasPermissionInList,
  userMayAccessSalesModule,
} from '../lib/moduleAccess';
import { userCanApproveEditMutationsClient } from '../lib/editApprovalUi';
import { canApproveStaffPurchaseCredit, canRejectStaffPurchaseCredit } from '../lib/hrAccess';
import { userMayViewManagementReportsClient } from '../lib/reportsAccess';
import { normalizeWorkspacePersonNames } from '../lib/normalizeWorkspacePersonNames';
import { formatPersonName } from '../lib/formatPersonName';
import {
  branchScopedCreateBlockedMessage,
  isBranchScopedCreateBlocked,
} from '../lib/workspaceBranchCreate';
import { sanitizeWorkItemForCache } from '../lib/workspaceSanitize.js';
import { appQueryClient, invalidateAppShellQueries } from '../lib/queryClient';
import { mergeDashboardPollIntoSnapshot } from '../lib/bootstrapPollMerge';
import {
  accessibleWorkspaceDomains,
  inferLoadedWorkspaceDomains,
  isConstrainedNetwork,
  planDomainPrefetch,
  snapshotHasUsableDomainData,
} from '../lib/workspaceDomainPrefetch';
import {
  clearPendingPasswordChange,
  hasPendingPasswordChange,
  markPendingPasswordChange,
  withPendingPasswordSession,
} from '../lib/pendingPasswordChange.js';
import { readDeskDomainCache, writeDeskDomainCache } from '../lib/deskDomainPersist.js';

const WorkspaceContext = createContext(null);

const BOOTSTRAP_CACHE_KEY_PREFIX = 'zarewa.bootstrap.cache.v4';
const BOOTSTRAP_CACHE_LAST_KEY = `${BOOTSTRAP_CACHE_KEY_PREFIX}:lastKey`;

function bootstrapCacheKey(session) {
  const uid = String(session?.user?.id || 'anon').trim() || 'anon';
  const bid = String(session?.currentBranchId || 'default').trim() || 'default';
  const all = session?.viewAllBranches ? ':all' : '';
  return `${BOOTSTRAP_CACHE_KEY_PREFIX}:${uid}:${bid}${all}`;
}

function parseBootstrapCacheRaw(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.ok) return null;
    if (!data.session?.user) return null;
    return data;
  } catch {
    return null;
  }
}

function readBootstrapCache(session) {
  try {
    const raw = sessionStorage.getItem(bootstrapCacheKey(session));
    return parseBootstrapCacheRaw(raw);
  } catch {
    return null;
  }
}

/** Hydrate instantly from the last signed-in session (stale-while-revalidate). */
function readLatestBootstrapCache() {
  try {
    const lastKey = sessionStorage.getItem(BOOTSTRAP_CACHE_LAST_KEY);
    if (lastKey) {
      const fromLast = parseBootstrapCacheRaw(sessionStorage.getItem(lastKey));
      if (fromLast) return fromLast;
    }
    const prefix = `${BOOTSTRAP_CACHE_KEY_PREFIX}:`;
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key || key === BOOTSTRAP_CACHE_LAST_KEY || !key.startsWith(prefix)) continue;
      const parsed = parseBootstrapCacheRaw(sessionStorage.getItem(key));
      if (parsed) return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeBootstrapCache(data) {
  try {
    if (data?.ok && data?.session?.user) {
      const key = bootstrapCacheKey(data.session);
      sessionStorage.setItem(key, JSON.stringify(sanitizeBootstrapForCache(data)));
      sessionStorage.setItem(BOOTSTRAP_CACHE_LAST_KEY, key);
    }
  } catch {
    /* ignore */
  }
}

function sanitizeBootstrapForCache(data) {
  if (!data?.ok) return data;
  const items = Array.isArray(data.unifiedWorkItems) ? data.unifiedWorkItems : [];
  return {
    ...data,
    unifiedWorkItems: items.map((item) => sanitizeWorkItemForCache(item)),
  };
}

/** Pull server changes from other users without a full page reload (ms). Override with `VITE_WORKSPACE_POLL_MS`. */
function workspacePollIntervalMs() {
  try {
    const raw = import.meta.env?.VITE_WORKSPACE_POLL_MS;
    if (raw != null && String(raw).trim() !== '') {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 5000) return n;
    }
  } catch {
    /* ignore */
  }
  return 90_000;
}

/**
 * How long the browser waits for `/api/bootstrap` before aborting.
 * Default 90s — slow/unstable links (common on mobile networks) often need more than 35s
 * for a full workspace sync. Override with `VITE_BOOTSTRAP_TIMEOUT_MS` (min 15s).
 */
function bootstrapFetchTimeoutMs() {
  try {
    const raw = import.meta.env?.VITE_BOOTSTRAP_TIMEOUT_MS;
    if (raw != null && String(raw).trim() !== '') {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 15_000) return n;
    }
  } catch {
    /* ignore */
  }
  return 90_000;
}

/**
 * Background polls (every workspacePollIntervalMs()) may fail on a merely slow/flaky connection,
 * not a real outage. Absorb this many consecutive poll failures — keep showing live data and
 * retry silently — before falling back to the read-only cached snapshot and locking the app.
 * Override with `VITE_POLL_FAILURE_TOLERANCE` (min 1).
 */
function pollFailureTolerance() {
  try {
    const raw = import.meta.env?.VITE_POLL_FAILURE_TOLERANCE;
    if (raw != null && String(raw).trim() !== '') {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 1) return Math.floor(n);
    }
  } catch {
    /* ignore */
  }
  return 5;
}

const BOOTSTRAP_FETCH_TIMEOUT_MS = bootstrapFetchTimeoutMs();
const POLL_FAILURE_TOLERANCE = pollFailureTolerance();
const MAX_RECONNECT_BACKOFF_MS = 120_000;

/**
 * Delay before reconnect attempt `attempt` (0-based) when the link is degraded.
 * Grows exponentially so a mill link that cannot finish a bootstrap stops being asked
 * to start another one every tick, and caps so recovery still happens unattended.
 * @param {number} baseMs @param {number} attempt
 */
export function reconnectBackoffMs(baseMs, attempt) {
  const base = Number(baseMs) > 0 ? Number(baseMs) : 12_000;
  const n = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 0;
  if (n > 31) return MAX_RECONNECT_BACKOFF_MS;
  return Math.min(base * 2 ** n, MAX_RECONNECT_BACKOFF_MS);
}

function clearBootstrapCache() {
  try {
    const prefix = `${BOOTSTRAP_CACHE_KEY_PREFIX}:`;
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
    sessionStorage.removeItem(BOOTSTRAP_CACHE_LAST_KEY);
    sessionStorage.removeItem('zarewa.bootstrap.cache.v2');
    sessionStorage.removeItem('zarewa.bootstrap.cache.v3');
  } catch {
    /* ignore */
  }
}

/** Keep first-login flags when a fast bootstrap refresh omits them for the same user. */
function attachUserPermissions(data) {
  if (!data?.session?.user) return data;
  const perms = data.permissions ?? data.session?.permissions ?? [];
  if (!Array.isArray(perms) || !perms.length) return data;
  const existing = data.session.user.permissions;
  if (Array.isArray(existing) && existing.length) return data;
  return {
    ...data,
    session: {
      ...data.session,
      user: { ...data.session.user, permissions: perms },
    },
  };
}

function mergeSessionOnboardingFlags(prevSnapshot, incoming) {
  const normalized = attachUserPermissions(normalizeWorkspacePersonNames(incoming));
  const prevUser = prevSnapshot?.session?.user;
  const nextUser = normalized?.session?.user;
  if (!nextUser?.id) {
    return normalized;
  }
  if (nextUser.mustChangePassword === false) {
    clearPendingPasswordChange(nextUser.id);
    return normalized;
  }
  if (!prevUser?.id || String(prevUser.id) !== String(nextUser.id)) {
    return normalized;
  }
  let user = nextUser;
  let changed = false;
  if (prevUser.trainingCompleted === false && nextUser.trainingCompleted !== true) {
    if (nextUser.trainingCompleted !== false) {
      user = { ...user, trainingCompleted: false };
      changed = true;
    }
  }
  if (!changed) return normalized;
  return {
    ...normalized,
    session: { ...normalized.session, user },
  };
}

export function WorkspaceProvider({ children }) {
  const initialBootstrap = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return readLatestBootstrapCache();
  }, []);
  const [status, setStatus] = useState(() => (initialBootstrap ? 'ok' : 'checking'));
  const [snapshot, setSnapshot] = useState(() =>
    initialBootstrap ? withPendingPasswordSession(initialBootstrap) : null
  );
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [dashboardSummaryEtag, setDashboardSummaryEtag] = useState('');
  const [lastError, setLastError] = useState(null);
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const [editApprovalsPendingCount, setEditApprovalsPendingCount] = useState(0);
  const [staffPurchaseCreditPendingCount, setStaffPurchaseCreditPendingCount] = useState(0);
  const [staffPurchaseCreditCrossBranch, setStaffPurchaseCreditCrossBranch] = useState(null);
  const [roleTrainingReplayOpen, setRoleTrainingReplayOpen] = useState(false);
  const [sessionMessage, setSessionMessage] = useState('');
  const sessionNoticeShownRef = useRef(false);
  const snapshotRef = useRef(null);
  const bootstrapPollEtagRef = useRef('');
  const bootstrapFullEtagRef = useRef('');
  const workspaceRevisionEtagRef = useRef('');
  const loadedDomainsRef = useRef(inferLoadedWorkspaceDomains(initialBootstrap));
  const domainInflightRef = useRef(new Map());
  const domainEtagRef = useRef(new Map());
  /** Last per-domain revisions seen, so a poll can tell which desks actually moved. */
  const domainRevisionsRef = useRef(null);
  const prefetchGenRef = useRef(0);
  const fullBootstrapLoadedRef = useRef(false);
  const lastErrorRef = useRef(null);
  const refreshSeqRef = useRef(0);
  const statusRef = useRef(status);
  const pollFailureStreakRef = useRef(0);
  /** Last measured `/api/livez` RTT — used to stretch bootstrap timeout on slow links. */
  const apiRttMsRef = useRef(null);

  const resetDomainRuntime = useCallback(() => {
    loadedDomainsRef.current = new Set();
    domainInflightRef.current = new Map();
    domainEtagRef.current = new Map();
    prefetchGenRef.current += 1;
  }, []);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (initialBootstrap && Array.isArray(initialBootstrap.ledgerEntries)) {
      replaceLedgerEntries(initialBootstrap.ledgerEntries);
    }
  }, [initialBootstrap]);

  useEffect(() => {
    lastErrorRef.current = lastError;
  }, [lastError]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const applySnapshot = useCallback((data, mode = 'ok') => {
    let merged = null;
    setSnapshot((prev) => {
      merged = mergeSessionOnboardingFlags(prev, withPendingPasswordSession(data));
      const uid = merged?.session?.user?.id;
      if (uid) {
        if (merged.session.user?.mustChangePassword) {
          markPendingPasswordChange(uid);
        } else {
          clearPendingPasswordChange(uid);
        }
      }
      return merged;
    });
    setStatus(mode);
    // Keep lastError for degraded/unstable banners; clear only on a healthy sync.
    if (mode === 'ok') setLastError(null);
    if (Array.isArray(merged?.ledgerEntries)) {
      replaceLedgerEntries(merged.ledgerEntries);
    }
    if ((mode === 'ok' || mode === 'unstable') && merged) {
      if (mode === 'ok') writeBootstrapCache(merged);
      for (const domain of inferLoadedWorkspaceDomains(merged)) {
        loadedDomainsRef.current.add(domain);
      }
    }
    if (typeof merged?.staffPurchaseCreditPendingCount === 'number') {
      setStaffPurchaseCreditPendingCount(merged.staffPurchaseCreditPendingCount);
    }
    if (merged?.staffPurchaseCreditCrossBranch && typeof merged.staffPurchaseCreditCrossBranch === 'object') {
      setStaffPurchaseCreditCrossBranch(merged.staffPurchaseCreditCrossBranch);
    }
    setRefreshEpoch((n) => n + 1);
    return merged;
  }, []);

  /**
   * After POST/PATCH /api/quotations, upsert the returned row into the live snapshot so new quotes
   * and paidNgn / paymentStatus updates appear immediately (shell refresh alone does not reload sales).
   */
  const mergeQuotationIntoSnapshot = useCallback((quotation) => {
    if (!quotation?.id) return;
    setSnapshot((prev) => {
      if (!prev || prev.ok !== true) return prev;
      const prevQuotations = Array.isArray(prev.quotations) ? prev.quotations : [];
      const id = String(quotation.id);
      const idx = prevQuotations.findIndex((q) => String(q.id) === id);
      const merged =
        idx >= 0 ? { ...prevQuotations[idx], ...quotation } : { ...quotation };
      if (merged.customer) merged.customer = formatPersonName(merged.customer);
      const nextQuotations =
        idx >= 0
          ? prevQuotations.map((q, i) => (i === idx ? merged : q))
          : [merged, ...prevQuotations];
      const next = { ...prev, quotations: nextQuotations };
      writeBootstrapCache(next);
      return next;
    });
    setRefreshEpoch((n) => n + 1);
  }, []);

  /** Generic in-place desk patch (close modal first; refresh domain in background). */
  const patchDomainSnapshot = useCallback((updater) => {
    if (typeof updater !== 'function') return;
    setSnapshot((prev) => {
      if (!prev || prev.ok !== true) return prev;
      const next = updater(prev);
      if (!next || next === prev) return prev;
      writeBootstrapCache(next);
      return next;
    });
    setRefreshEpoch((n) => n + 1);
  }, []);

  const mergeSnapshotPatch = useCallback((patch) => {
    if (!patch || patch.ok !== true) return null;
    const { domain: domainKey, ok: _ok, ...fields } = patch;
    let merged = null;
    setSnapshot((prev) => {
      const prevDeferred = Array.isArray(prev?.bootstrapMeta?.deferredDeskArrays)
        ? prev.bootstrapMeta.deferredDeskArrays
        : [];
      // Sales domain may omit quotationLines for payload size — never wipe lines already hydrated
      // from POST/PATCH or GET /api/quotations/:id (cutting list + print need them).
      let nextFields = fields;
      if (Array.isArray(fields.quotations) && Array.isArray(prev?.quotations)) {
        const prevById = new Map(
          prev.quotations
            .filter((q) => q?.id && q.quotationLines)
            .map((q) => [String(q.id), q.quotationLines])
        );
        if (prevById.size) {
          nextFields = {
            ...fields,
            quotations: fields.quotations.map((q) => {
              if (!q?.id || q.quotationLines) return q;
              const kept = prevById.get(String(q.id));
              return kept ? { ...q, quotationLines: kept } : q;
            }),
          };
        }
      }
      const filledKeys = Object.keys(nextFields).filter(
        (k) => Array.isArray(nextFields[k]) && nextFields[k].length > 0
      );
      const nextDeferred = prevDeferred.filter((k) => !filledKeys.includes(k));
      merged = mergeSessionOnboardingFlags(prev, {
        ...(prev || {}),
        ok: true,
        ...nextFields,
        bootstrapMeta: {
          ...(prev?.bootstrapMeta || {}),
          mode: domainKey ? 'hydrated' : prev?.bootstrapMeta?.mode,
          deferredDeskArrays: nextDeferred,
          truncated: {
            ...(prev?.bootstrapMeta?.truncated || {}),
            ...Object.fromEntries(filledKeys.map((k) => [k, false])),
          },
        },
      });
      if (Array.isArray(merged?.ledgerEntries)) {
        replaceLedgerEntries(merged.ledgerEntries);
      }
      writeBootstrapCache(merged);
      return merged;
    });
    setRefreshEpoch((n) => n + 1);
    return merged;
  }, []);

  const refreshDashboardSummary = useCallback(async () => {
    try {
      const headers = dashboardSummaryEtag ? { 'If-None-Match': dashboardSummaryEtag } : {};
      const r = await fetch(apiUrl('/api/dashboard/summary'), {
        method: 'GET',
        credentials: 'include',
        headers,
      });
      if (r.status === 304) return dashboardSummary;
      const data = await r.json().catch(() => null);
      if (r.status === 401 || data?.code === 'AUTH_REQUIRED') {
        setDashboardSummary(null);
        setDashboardSummaryEtag('');
        return null;
      }
      if (!r.ok || !data?.ok) return dashboardSummary;
      const etag = r.headers.get('ETag') || '';
      setDashboardSummary(data);
      setDashboardSummaryEtag(etag);
      return data;
    } catch {
      return dashboardSummary;
    }
  }, [dashboardSummary, dashboardSummaryEtag]);

  /**
   * Reload workspace bootstrap. Successful loads always merge into React state (including the
   * periodic poll and tab-focus pull) so other users’ changes appear without a full page reload.
   * Options: `mode` (e.g. `dashboard`). Modals should hydrate from a stable signature (see
   * QuotationModal / CuttingListModal) so snapshot churn does not reset in-progress edits.
   */
  const refresh = useCallback(async (opts = {}) => {
    const seq = ++refreshSeqRef.current;
    const stale = () => seq !== refreshSeqRef.current;
    try {
      const mode = String(opts?.mode ?? '').trim();
      const isPoll = Boolean(opts?.poll);
      const forceFull = Boolean(opts?.forceFull);
      // Default to lean shell unless an explicit full bootstrap is requested.
      // Desk registers hydrate via `/api/workspace/{domain}-snapshot`.
      const effectiveMode = forceFull ? '' : mode || 'shell';
      const qsParts = [];
      if (effectiveMode) qsParts.push(`mode=${encodeURIComponent(effectiveMode)}`);
      if (isPoll) qsParts.push('poll=1', 'active=1');
      const qs = qsParts.length ? `?${qsParts.join('&')}` : '';
      if (!isPoll) {
        bootstrapPollEtagRef.current = '';
      }
      const skipEtag = Boolean(opts?.forceReconnect);
      const etag = skipEtag ? '' : isPoll ? bootstrapPollEtagRef.current : bootstrapFullEtagRef.current;
      let r;
      const timeoutMs = adaptiveBootstrapTimeoutMs(BOOTSTRAP_FETCH_TIMEOUT_MS, apiRttMsRef.current);
      try {
        r = await fetchWithTimeoutRetry(
          apiUrl(`/api/bootstrap${qs}`),
          {
            method: 'GET',
            credentials: 'include',
            headers: etag ? { 'If-None-Match': etag } : {},
          },
          {
            timeoutMs,
            // User-facing loads get one retry; background polls stay single-shot to avoid stampede.
            retries: isPoll ? 0 : 1,
            pauseMs: 1_500,
          }
        );
      } catch (err) {
        const degradedMsg = await probeDegradedApiHealth(fetch, apiUrl);
        if (err?.name === 'AbortError') {
          throw new Error(
            degradedMsg ||
              'Workspace bootstrap timed out. The API or database may be slow or offline — check the server and try again.'
          );
        }
        throw new Error(degradedMsg || formatBootstrapNetworkError(err));
      }
      if (r.status === 304) {
        // Server is reachable — leave degraded/read-only lock (304 used to leave status stuck).
        pollFailureStreakRef.current = 0;
        if (stale()) return snapshotRef.current;
        setStatus('ok');
        setLastError(null);
        return snapshotRef.current;
      }
      const text = await r.text();
      if (isSpaHtmlResponse(text)) {
        throw new Error(formatBootstrapConnectError(r.status, { error: text.slice(0, 200) }));
      }
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { ok: false, error: String(text || 'Invalid JSON').slice(0, 500) };
      }
      const httpStatus = r.status;
      const nextEtag = r.headers.get('ETag') || '';
      if (isPoll) bootstrapPollEtagRef.current = nextEtag;
      else bootstrapFullEtagRef.current = nextEtag;
      if (httpStatus === 401 || data?.code === 'AUTH_REQUIRED') {
        pollFailureStreakRef.current = 0;
        if (stale()) return snapshotRef.current;
        const uid = snapshotRef.current?.session?.user?.id;
        if (uid && hasPendingPasswordChange(uid)) {
          setSessionMessage('Session could not be refreshed. Set your new password or sign out and try again.');
          return snapshotRef.current;
        }
        clearBootstrapCache();
        appQueryClient.clear();
        setStatus('auth_required');
        setSnapshot(null);
        setLastError(null);
        resetDomainRuntime();
        fullBootstrapLoadedRef.current = false;
        workspaceRevisionEtagRef.current = '';
        if (!sessionNoticeShownRef.current) {
          setSessionMessage('Your session has expired. Please sign in again.');
          sessionNoticeShownRef.current = true;
        }
        replaceLedgerEntries([]);
        return null;
      }
      if (data?.code === 'CSRF_INVALID') {
        setSessionMessage('Your session security token expired. Please sign in again.');
      }
      if (!r.ok || !data?.ok) {
        throw new Error(formatBootstrapConnectError(httpStatus, data));
      }
      if (!effectiveMode && !isPoll) {
        fullBootstrapLoadedRef.current = true;
      }
      pollFailureStreakRef.current = 0;
      if (stale()) return snapshotRef.current;
      if (!isPoll) invalidateAppShellQueries();
      const prevSnap = snapshotRef.current;
      const incoming =
        prevSnap?.ok &&
        (isPoll || effectiveMode === 'shell' || effectiveMode === 'dashboard')
          ? mergeDashboardPollIntoSnapshot(prevSnap, data)
          : data;
      return applySnapshot(withPendingPasswordSession(incoming), 'ok');
    } catch (e) {
      if (stale()) return snapshotRef.current;
      const wasLive =
        statusRef.current === 'ok' ||
        statusRef.current === 'unstable' ||
        (statusRef.current === 'checking' && snapshotRef.current?.ok);
      // Background polls: absorb consecutive misses while still live — do not hard-lock yet.
      if (Boolean(opts?.poll) && (statusRef.current === 'ok' || statusRef.current === 'unstable')) {
        pollFailureStreakRef.current += 1;
        if (pollFailureStreakRef.current <= POLL_FAILURE_TOLERANCE) {
          return snapshotRef.current;
        }
      }

      // Health-aware: if the API answers livez, sync is slow — keep desks writable (soft mode).
      const live = await probeApiReachable(fetch, apiUrl);
      if (live.reachable && live.rttMs != null) apiRttMsRef.current = live.rttMs;
      const errMsg = String(e.message || e);
      if (live.reachable && (wasLive || snapshotRef.current?.ok)) {
        pollFailureStreakRef.current = 0;
        if (stale()) return snapshotRef.current;
        setStatus('unstable');
        setLastError(
          errMsg ||
            'Connection is slow or sync timed out. You can keep working — the app will retry in the background.'
        );
        return snapshotRef.current;
      }
      if (live.reachable) {
        const cachedWhileLive = readBootstrapCache(snapshotRef.current?.session);
        if (cachedWhileLive) {
          if (stale()) return snapshotRef.current;
          const merged = applySnapshot(withPendingPasswordSession(cachedWhileLive), 'unstable');
          setLastError(
            errMsg ||
              'Workspace sync is slow. Showing the last good copy — saves still go to the live server when reachable.'
          );
          return merged;
        }
      }

      const cached = readBootstrapCache(snapshotRef.current?.session);
      if (cached) {
        if (stale()) return snapshotRef.current;
        const merged = applySnapshot(withPendingPasswordSession(cached), 'degraded');
        setLastError(errMsg);
        return merged;
      }
      const uid = snapshotRef.current?.session?.user?.id;
      if (uid && hasPendingPasswordChange(uid)) {
        setLastError(errMsg);
        return snapshotRef.current;
      }
      setStatus('offline');
      setSnapshot(null);
      setLastError(errMsg);
      resetDomainRuntime();
      fullBootstrapLoadedRef.current = false;
      workspaceRevisionEtagRef.current = '';
      return null;
    }
  }, [applySnapshot, resetDomainRuntime]);

  const ensureDomainLoaded = useCallback(
    async (domain, opts = {}) => {
      const key = String(domain || '').trim().toLowerCase();
      const force = Boolean(opts?.force);
      if (!key) return snapshotRef.current;
      if (!force && loadedDomainsRef.current.has(key)) return snapshotRef.current;

      const inflight = domainInflightRef.current.get(key);
      if (inflight && !force) return inflight;

      const run = (async () => {
        try {
          const uid = snapshotRef.current?.session?.user?.id;
          const scope = snapshotRef.current?.branchScope || '';
          if (!force && uid) {
            const cached = await readDeskDomainCache(uid, scope, key);
            if (cached?.ok) {
              loadedDomainsRef.current.add(key);
              mergeSnapshotPatch(cached);
            }
          }
          const etag = force ? '' : domainEtagRef.current.get(key) || '';
          const timeoutMs = adaptiveBootstrapTimeoutMs(BOOTSTRAP_FETCH_TIMEOUT_MS, apiRttMsRef.current);
          const r = await fetchWithTimeoutRetry(
            apiUrl(`/api/workspace/${encodeURIComponent(key)}-snapshot`),
            {
              method: 'GET',
              credentials: 'include',
              headers: etag ? { 'If-None-Match': etag } : {},
            },
            { timeoutMs, retries: 1, pauseMs: 1_500 }
          );
          if (r.status === 304) {
            loadedDomainsRef.current.add(key);
            setRefreshEpoch((n) => n + 1);
            return snapshotRef.current;
          }
          const data = await r.json().catch(() => null);
          if (!r.ok || !data?.ok) return snapshotRef.current;
          const nextEtag = r.headers.get('ETag') || '';
          if (nextEtag) domainEtagRef.current.set(key, nextEtag);
          loadedDomainsRef.current.add(key);
          const merged = mergeSnapshotPatch(data) ?? snapshotRef.current;
          if (uid) void writeDeskDomainCache(uid, scope, key, data);
          return merged;
        } catch {
          return snapshotRef.current;
        } finally {
          domainInflightRef.current.delete(key);
        }
      })();

      domainInflightRef.current.set(key, run);
      return run;
    },
    [mergeSnapshotPatch]
  );

  const refreshDomain = useCallback(
    async (domain) => {
      const key = String(domain || '').trim().toLowerCase();
      if (!key) return snapshotRef.current;
      return ensureDomainLoaded(key, { force: true });
    },
    [ensureDomainLoaded]
  );

  const prefetchWorkspaceDomains = useCallback(
    async (opts = {}) => {
      const snap = snapshotRef.current;
      if (!snap?.ok) return;
      const uid = snap.session?.user?.id;
      if (uid && hasPendingPasswordChange(uid)) return;

      const perms = snap.permissions ?? snap.session?.permissions ?? [];
      const roleKey = snap.session?.user?.roleKey;
      let domains = accessibleWorkspaceDomains(perms, roleKey);

      const priority = String(opts.priorityDomain || '').trim().toLowerCase();
      if (priority && domains.includes(priority)) {
        domains = [priority, ...domains.filter((d) => d !== priority)];
      }
      if (Array.isArray(opts.only) && opts.only.length) {
        const only = new Set(opts.only.map((d) => String(d).trim().toLowerCase()));
        domains = domains.filter((d) => only.has(d));
      }

      const gen = ++prefetchGenRef.current;
      const force = Boolean(opts.force);
      const pending = domains.filter((d) => force || !loadedDomainsRef.current.has(d));
      if (!pending.length) return;

      // Default: primary desk only. Secondary warm only when explicitly requested on a healthy link.
      const planned = planDomainPrefetch(pending, {
        forceAll: Boolean(opts.forceAll),
        primaryOnly: Boolean(opts.primaryOnly) || !opts.warmSecondary,
        warmSecondary: Boolean(opts.warmSecondary),
        rttMs: apiRttMsRef.current,
      });
      for (const domain of planned) {
        if (gen !== prefetchGenRef.current) return;
        await ensureDomainLoaded(domain, { force });
      }
    },
    [ensureDomainLoaded]
  );

  const isDomainLoaded = useCallback((domain) => {
    const key = String(domain || '').trim().toLowerCase();
    if (!key) return false;
    if (loadedDomainsRef.current.has(key)) return true;
    return snapshotHasUsableDomainData(snapshotRef.current, key);
  }, []);

  const ensureFullBootstrap = useCallback(async () => {
    if (fullBootstrapLoadedRef.current) return snapshotRef.current;
    const result = await refresh({ forceFull: true });
    if (result) fullBootstrapLoadedRef.current = true;
    return result;
  }, [refresh]);

  const pollWorkspaceChanges = useCallback(async () => {
    try {
      const headers = workspaceRevisionEtagRef.current
        ? { 'If-None-Match': workspaceRevisionEtagRef.current }
        : {};
      const revRes = await fetch(apiUrl('/api/workspace/revision'), {
        method: 'GET',
        credentials: 'include',
        headers,
      });
      if (revRes.status === 304) return snapshotRef.current;
      const revEtag = revRes.headers.get('ETag') || '';
      if (revEtag) workspaceRevisionEtagRef.current = revEtag;

      // Soft invalidate: refresh shell meta; keep loaded desk packs in memory.
      // Clearing domain etags forces conditional revalidate; do not wipe loadedDomainsRef
      // (that re-downloads multi-MB packs on every remote change — fatal on poor networks).
      const prevLoaded = [...loadedDomainsRef.current];
      const revBody = revRes.ok ? await revRes.json().catch(() => null) : null;

      // The global revision moves on any change anywhere, so one cashier's receipt used
      // to make every desk revalidate its pack. Per-domain revisions narrow that to the
      // desks that actually moved. A server that does not send them (or a first poll with
      // nothing to compare) falls through to invalidating all of them, as before.
      const nextDomainRevs = revBody?.domains;
      const prevDomainRevs = domainRevisionsRef.current;
      const changedDomains =
        nextDomainRevs && prevDomainRevs
          ? prevLoaded.filter((d) => nextDomainRevs[d] !== prevDomainRevs[d])
          : prevLoaded;
      if (nextDomainRevs) domainRevisionsRef.current = nextDomainRevs;

      await refresh({ poll: true, mode: 'shell' });
      for (const domain of changedDomains) domainEtagRef.current.delete(domain);
      const primary = planDomainPrefetch(changedDomains, {
        primaryOnly: true,
        rttMs: apiRttMsRef.current,
      })[0];
      if (primary) {
        void ensureDomainLoaded(primary, { force: true });
      }
      return snapshotRef.current;
    } catch {
      return snapshotRef.current;
    }
  }, [refresh, ensureDomainLoaded]);

  const login = useCallback(
    async (username, password) => {
      try {
        const { ok, data } = await apiFetch('/api/session/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
        if (!ok || !data?.ok) {
          const code = data?.code || '';
          let error = data?.error || 'Sign-in failed.';
          if (code === 'ACCOUNT_LOCKED') {
            error = data?.error || 'Account locked after too many failed attempts. Try again later.';
          } else if (code === 'RATE_LIMITED') {
            error = data?.error || 'Too many sign-in attempts. Wait and try again.';
          } else if (code === 'INVALID_CREDENTIALS') {
            error = data?.error || 'Invalid username or password.';
          }
          return { ok: false, error, code };
        }
        setSessionMessage('');
        sessionNoticeShownRef.current = false;
        if (data.user?.mustChangePassword) {
          markPendingPasswordChange(data.user.id);
        } else if (data.user?.id) {
          clearPendingPasswordChange(data.user.id);
        }
        // Hydrate session immediately so first-login password modal appears before bootstrap finishes.
        applySnapshot(
          {
            ok: true,
            session: {
              authenticated: data.authenticated ?? true,
              user: data.user ?? null,
              permissions: data.permissions ?? [],
              currentBranchId: data.currentBranchId,
              viewAllBranches: data.viewAllBranches,
              branches: data.branches,
              sessionExpiresAtIso: data.sessionExpiresAtIso,
              sessionTimeoutMinutes: data.sessionTimeoutMinutes,
              sessionWarningSeconds: data.sessionWarningSeconds,
            },
            permissions: data.permissions ?? [],
          },
          'ok'
        );
        const needsPasswordChange =
          Boolean(data.user?.mustChangePassword) || hasPendingPasswordChange(data.user?.id);
        if (!needsPasswordChange) {
          resetDomainRuntime();
          fullBootstrapLoadedRef.current = false;
          workspaceRevisionEtagRef.current = '';
          bootstrapPollEtagRef.current = '';
          bootstrapFullEtagRef.current = '';
          await refreshDashboardSummary();
          const boot = await refresh({ mode: 'shell' });
          if (!boot) {
            return {
              ok: false,
              error:
                lastErrorRef.current ||
                'Sign-in succeeded but workspace bootstrap failed. Restart the API and try again.',
            };
          }
          void prefetchWorkspaceDomains();
        }
        return { ok: true, data };
      } catch (e) {
        setStatus('offline');
        setSnapshot(null);
        setLastError(String(e.message || e));
        replaceLedgerEntries([]);
        return {
          ok: false,
          error: 'API server is offline. Start the backend server, then sign in again.',
        };
      }
    },
    [applySnapshot, refresh, refreshDashboardSummary, prefetchWorkspaceDomains, resetDomainRuntime]
  );

  const forgotPassword = useCallback(
    async (identifier) => {
      try {
        const { ok, data } = await apiFetch('/api/session/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ identifier }),
        });
        if (!ok || !data?.ok) {
          return { ok: false, error: data?.error || 'Could not request password reset.' };
        }
        return { ok: true, data };
      } catch (e) {
        setStatus('offline');
        setSnapshot(null);
        setLastError(String(e.message || e));
        replaceLedgerEntries([]);
        return {
          ok: false,
          error: 'API server is offline. Start the backend server, then try again.',
        };
      }
    },
    []
  );

  const resetPassword = useCallback(
    async (identifier, token, newPassword) => {
      try {
        const { ok, data } = await apiFetch('/api/session/reset-password', {
          method: 'POST',
          body: JSON.stringify({ identifier, token, newPassword }),
        });
        if (!ok || !data?.ok) {
          return { ok: false, error: data?.error || 'Could not reset password.' };
        }
        return { ok: true, data };
      } catch (e) {
        setStatus('offline');
        setSnapshot(null);
        setLastError(String(e.message || e));
        replaceLedgerEntries([]);
        return {
          ok: false,
          error: 'API server is offline. Start the backend server, then try again.',
        };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/session/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    const uid = snapshotRef.current?.session?.user?.id;
    if (uid) clearPendingPasswordChange(uid);
    replaceLedgerEntries([]);
    clearBootstrapCache();
    appQueryClient.clear();
    bootstrapPollEtagRef.current = '';
    bootstrapFullEtagRef.current = '';
    workspaceRevisionEtagRef.current = '';
    resetDomainRuntime();
    fullBootstrapLoadedRef.current = false;
    sessionNoticeShownRef.current = false;
    setSnapshot(null);
    setDashboardSummary(null);
    setDashboardSummaryEtag('');
    setLastError(null);
    setStatus('auth_required');
  }, [resetDomainRuntime]);

  const endSessionForTimeout = useCallback(async () => {
    const mins = Number(snapshot?.session?.sessionTimeoutMinutes) || 120;
    const uid = snapshotRef.current?.session?.user?.id;
    try {
      await apiFetch('/api/session/timeout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    if (uid) clearPendingPasswordChange(uid);
    replaceLedgerEntries([]);
    clearBootstrapCache();
    appQueryClient.clear();
    bootstrapPollEtagRef.current = '';
    bootstrapFullEtagRef.current = '';
    workspaceRevisionEtagRef.current = '';
    resetDomainRuntime();
    fullBootstrapLoadedRef.current = false;
    sessionNoticeShownRef.current = false;
    setSnapshot(null);
    setDashboardSummary(null);
    setDashboardSummaryEtag('');
    setLastError(null);
    setSessionMessage(`You were signed out after ${mins} minutes of inactivity.`);
    sessionNoticeShownRef.current = true;
    setStatus('auth_required');
  }, [snapshot?.session?.sessionTimeoutMinutes, resetDomainRuntime]);

  const touchSessionActivity = useCallback(async () => {
    try {
      await apiFetch('/api/session/activity', { method: 'POST', body: '{}' });
    } catch {
      /* ignore */
    }
  }, []);

  const clearSessionMessage = useCallback(() => setSessionMessage(''), []);

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const { ok, data } = await apiFetch('/api/session/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!ok || !data?.ok) {
        return { ok: false, error: data?.error || 'Could not change password.' };
      }
      const uid = snapshotRef.current?.session?.user?.id;
      if (uid) clearPendingPasswordChange(uid);
      if (data?.user) {
        setSnapshot((prev) => {
          if (!prev?.session?.user) return prev;
          const next = {
            ...prev,
            session: { ...prev.session, user: { ...prev.session.user, ...data.user } },
          };
          writeBootstrapCache(next);
          return next;
        });
        setRefreshEpoch((n) => n + 1);
      }
      bootstrapPollEtagRef.current = '';
      await refresh({ forceFull: true });
      return { ok: true };
    },
    [refresh]
  );

  const completeTraining = useCallback(async () => {
    const { ok, data } = await apiFetch('/api/session/complete-training', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!ok || !data?.ok) {
      return { ok: false, error: data?.error || 'Could not save training completion.' };
    }
    if (data?.user) {
      setSnapshot((prev) => {
        if (!prev?.session?.user) return prev;
        const next = {
          ...prev,
          session: { ...prev.session, user: { ...prev.session.user, ...data.user } },
        };
        writeBootstrapCache(next);
        return next;
      });
      setRefreshEpoch((n) => n + 1);
    }
    await refresh();
    return { ok: true };
  }, [refresh]);

  const openRoleTrainingReplay = useCallback(() => {
    setRoleTrainingReplayOpen(true);
  }, []);

  const closeRoleTrainingReplay = useCallback(() => {
    setRoleTrainingReplayOpen(false);
  }, []);

  /** @param {{ displayName?: string; email?: string | null; avatarUrl?: string | null }} patch */
  const updateProfile = useCallback(async (patch) => {
    const { ok, data } = await apiFetch('/api/session/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch ?? {}),
    });
    if (!ok || !data?.ok) {
      return { ok: false, error: data?.error || 'Could not update profile.', code: data?.code };
    }
    await refresh();
    return { ok: true, user: data.user };
  }, [refresh]);

  /** @param {{ currentBranchId?: string; viewAllBranches?: boolean }} patch */
  const updateWorkspace = useCallback(
    async (patch) => {
      const { ok, data } = await apiFetch('/api/session/workspace', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (!ok || !data?.ok) {
        return { ok: false, error: data?.error || 'Could not update workspace.' };
      }
      resetDomainRuntime();
      fullBootstrapLoadedRef.current = false;
      workspaceRevisionEtagRef.current = '';
      bootstrapPollEtagRef.current = '';
      bootstrapFullEtagRef.current = '';
      await refresh({ mode: 'shell' });
      void prefetchWorkspaceDomains({ force: true });
      return { ok: true, data };
    },
    [refresh, prefetchWorkspaceDomains, resetDomainRuntime]
  );

  const getUnifiedWorkItemById = useCallback(
    (workItemId) => {
      const items = Array.isArray(snapshot?.unifiedWorkItems) ? snapshot.unifiedWorkItems : [];
      return items.find((item) => item.id === workItemId || item.referenceNo === workItemId) ?? null;
    },
    [snapshot?.unifiedWorkItems]
  );

  useEffect(() => {
    void refresh({ mode: 'shell' });
  }, [refresh]);

  /** Warm the primary desk only; siblings only on idle healthy links. */
  useEffect(() => {
    if (status !== 'ok' && status !== 'unstable') return undefined;
    const uid = snapshotRef.current?.session?.user?.id;
    if (uid && hasPendingPasswordChange(uid)) return undefined;

    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await prefetchWorkspaceDomains({ primaryOnly: true });
      if (cancelled) return;
      if (!isConstrainedNetwork({ rttMs: apiRttMsRef.current })) {
        void prefetchWorkspaceDomains({ warmSecondary: true });
      }
    };

    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(() => {
        void run();
      }, { timeout: 1200 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(() => {
      void run();
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [status, snapshot?.permissions, snapshot?.session?.permissions, snapshot?.branchScope, prefetchWorkspaceDomains]);

  /** Never leave the shell stuck on "Preparing live workspace…" if bootstrap hangs. */
  useEffect(() => {
    if (status !== 'checking') return undefined;
    const id = window.setTimeout(() => {
      setStatus((current) => {
        if (current !== 'checking') return current;
        return 'offline';
      });
      setLastError((prev) =>
        prev ||
        'Workspace bootstrap is taking too long. Check that the API server and database are running, then refresh.'
      );
      setSnapshot(null);
    }, BOOTSTRAP_FETCH_TIMEOUT_MS + 5000);
    return () => window.clearTimeout(id);
  }, [status]);

  /** After a transient outage or slow sync, retry bootstrap until live sync is restored. */
  useEffect(() => {
    if (status !== 'degraded' && status !== 'unstable') return undefined;
    const baseMs = status === 'unstable' ? 12_000 : 20_000;
    let cancelled = false;
    let timer = 0;
    let attempt = 0;

    const run = async () => {
      // Only the first attempt skips the ETag. Later ones stay conditional so a 304
      // can end the retry loop for a few hundred bytes instead of a whole bootstrap.
      try {
        await refresh({ forceReconnect: attempt === 0 });
      } catch {
        /* stay in the loop; the next attempt is already scheduled below */
      }
      if (cancelled) return;
      attempt += 1;
      // Chain from completion, never on a fixed interval: on a link too slow to
      // finish a bootstrap inside one tick, an interval stacks retries that then
      // compete for the same pipe and keep the connection from ever recovering.
      timer = window.setTimeout(run, reconnectBackoffMs(baseMs, attempt));
    };

    timer = window.setTimeout(run, baseMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [status, refresh]);

  /** Browser regained network — try to leave soft/hard offline without waiting for the timer. */
  useEffect(() => {
    const onOnline = () => {
      if (statusRef.current === 'degraded' || statusRef.current === 'unstable' || statusRef.current === 'offline') {
        void refresh({ forceReconnect: true });
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [refresh]);

  /** Timer + tab focus: cheap revision check, then bootstrap poll only when data changed. */
  useEffect(() => {
    if (status !== 'ok' && status !== 'unstable') return undefined;
    const ms = workspacePollIntervalMs();
    const pull = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const uid = snapshotRef.current?.session?.user?.id;
      if (uid && hasPendingPasswordChange(uid)) return;
      void pollWorkspaceChanges();
      void refreshDashboardSummary();
    };
    const id = window.setInterval(pull, ms);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void touchSessionActivity();
        void pollWorkspaceChanges();
        void refreshDashboardSummary();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, pollWorkspaceChanges, refreshDashboardSummary, touchSessionActivity]);

  const session = snapshot?.session ?? null;
  const branchScope = snapshot?.branchScope ?? null;
  const viewAllBranches = Boolean(session?.viewAllBranches);
  const blocksBranchScopedCreate = isBranchScopedCreateBlocked({ viewAllBranches, session, snapshot });
  const branchScopedCreateMessage = useMemo(
    () =>
      blocksBranchScopedCreate
        ? branchScopedCreateBlockedMessage({ viewAllBranches, session, snapshot })
        : '',
    [blocksBranchScopedCreate, viewAllBranches, session, snapshot]
  );
  const permissions = useMemo(
    () => snapshot?.permissions ?? session?.permissions ?? [],
    [snapshot?.permissions, session?.permissions]
  );

  const hasPermission = useCallback(
    (permission) => hasPermissionInList(permissions, permission),
    [permissions]
  );

  const canAccessModule = useCallback(
    (moduleKey) => {
      if (moduleKey === 'edit_approvals') {
        return (
          canAccessModuleWithPermissions(permissions, 'edit_approvals') &&
          userCanApproveEditMutationsClient(session?.user?.roleKey, permissions)
        );
      }
      if (moduleKey === 'reports') {
        return (
          canAccessModuleWithPermissions(permissions, 'reports') &&
          userMayViewManagementReportsClient(session?.user?.roleKey, permissions)
        );
      }
      if (moduleKey === 'sales') {
        return userMayAccessSalesModule(session?.user?.roleKey, permissions);
      }
      return canAccessModuleWithPermissions(permissions, moduleKey);
    },
    [permissions, session?.user?.roleKey]
  );

  const refreshEditApprovalsPending = useCallback(async () => {
    const roleKey = session?.user?.roleKey;
    if (
      !userCanApproveEditMutationsClient(roleKey, permissions) ||
      !canAccessModuleWithPermissions(permissions, 'edit_approvals')
    ) {
      setEditApprovalsPendingCount(0);
      return;
    }
    const { ok, data } = await apiFetch('/api/edit-approvals/pending');
    if (ok && data?.ok && Array.isArray(data.items)) {
      setEditApprovalsPendingCount(data.items.length);
    }
  }, [permissions, session?.user?.roleKey]);

  useEffect(() => {
    if (status === 'checking' || status === 'auth_required') {
      setEditApprovalsPendingCount(0);
      return;
    }
    const roleKey = session?.user?.roleKey;
    if (
      !userCanApproveEditMutationsClient(roleKey, permissions) ||
      !canAccessModuleWithPermissions(permissions, 'edit_approvals')
    ) {
      setEditApprovalsPendingCount(0);
      return;
    }
    void refreshEditApprovalsPending();
    // Slow links: poll less often; pause when the tab is hidden.
    const intervalMs = isConstrainedNetwork() ? 120_000 : 45_000;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void refreshEditApprovalsPending();
    };
    const t = setInterval(tick, intervalMs);
    return () => clearInterval(t);
  }, [status, refreshEditApprovalsPending, permissions, session?.user?.roleKey]);

  const refreshStaffPurchaseCreditPending = useCallback(async () => {
    const roleKey = session?.user?.roleKey;
    const perms = permissions;
    const canSee =
      canApproveStaffPurchaseCredit(roleKey, perms) || canRejectStaffPurchaseCredit(roleKey, perms);
    if (!canSee) {
      setStaffPurchaseCreditPendingCount(0);
      setStaffPurchaseCreditCrossBranch(null);
      return;
    }
    const { ok, data } = await apiFetch('/api/staff-purchase-credits/pending-count');
    if (ok && data?.ok) {
      setStaffPurchaseCreditPendingCount(Number(data.count) || 0);
      setStaffPurchaseCreditCrossBranch(data.crossBranch || null);
    }
  }, [permissions, session?.user?.roleKey]);

  /** One-shot after auth — no 45s poll (staff credit is on-demand via refreshStaffPurchaseCreditPending). */
  useEffect(() => {
    if (status === 'checking' || status === 'auth_required') {
      setStaffPurchaseCreditPendingCount(0);
      setStaffPurchaseCreditCrossBranch(null);
      return;
    }
    void refreshStaffPurchaseCreditPending();
  }, [status, refreshStaffPurchaseCreditPending]);

  /** Writable when the API is reachable — including soft "unstable" (slow sync, not a real outage). */
  const canMutate = status === 'ok' || status === 'unstable';
  const usingCachedData = status === 'degraded';
  const connectionUnstable = status === 'unstable';
  const hasWorkspaceData =
    (status === 'ok' || status === 'degraded' || status === 'unstable') && snapshot != null;

  const value = useMemo(
    () => ({
      status,
      snapshot,
      dashboardSummary,
      lastError,
      refresh,
      refreshDashboardSummary,
      pollWorkspaceChanges,
      ensureDomainLoaded,
      prefetchWorkspaceDomains,
      isDomainLoaded,
      ensureFullBootstrap,
      refreshEpoch,
      /** Live server reachable — reads and writes go to API (includes soft unstable). */
      apiOnline: status === 'ok' || status === 'unstable',
      /** Bootstrap loaded (live or last cached sync in this tab). */
      hasWorkspaceData,
      /** Last successful bootstrap in this browser tab (read-only when server drops). */
      usingCachedData,
      /** Sync is slow but API is reachable — keep working; non-blocking banner. */
      connectionUnstable,
      /** POST/PATCH allowed (not read-only degraded mode). */
      canMutate,
      apiUrl,
      authRequired: status === 'auth_required',
      session,
      branchScope,
      viewAllBranches,
      blocksBranchScopedCreate,
      branchScopedCreateMessage,
      permissions,
      hasPermission,
      canAccessModule,
      editApprovalsPendingCount,
      refreshEditApprovalsPending,
      staffPurchaseCreditPendingCount,
      staffPurchaseCreditCrossBranch,
      refreshStaffPurchaseCreditPending,
      mergeQuotationIntoSnapshot,
      patchDomainSnapshot,
      refreshDomain,
      login,
      sessionMessage,
      clearSessionMessage,
      endSessionForTimeout,
      touchSessionActivity,
      forgotPassword,
      resetPassword,
      logout,
      changePassword,
      completeTraining,
      openRoleTrainingReplay,
      closeRoleTrainingReplay,
      roleTrainingReplayOpen,
      updateProfile,
      updateWorkspace,
      getUnifiedWorkItemById,
    }),
    [
      status,
      snapshot,
      dashboardSummary,
      lastError,
      refresh,
      refreshDashboardSummary,
      pollWorkspaceChanges,
      ensureDomainLoaded,
      prefetchWorkspaceDomains,
      isDomainLoaded,
      ensureFullBootstrap,
      refreshEpoch,
      hasWorkspaceData,
      usingCachedData,
      connectionUnstable,
      canMutate,
      session,
      branchScope,
      viewAllBranches,
      blocksBranchScopedCreate,
      branchScopedCreateMessage,
      permissions,
      hasPermission,
      canAccessModule,
      editApprovalsPendingCount,
      refreshEditApprovalsPending,
      staffPurchaseCreditPendingCount,
      staffPurchaseCreditCrossBranch,
      refreshStaffPurchaseCreditPending,
      mergeQuotationIntoSnapshot,
      patchDomainSnapshot,
      refreshDomain,
      login,
      sessionMessage,
      clearSessionMessage,
      endSessionForTimeout,
      touchSessionActivity,
      forgotPassword,
      resetPassword,
      logout,
      changePassword,
      completeTraining,
      openRoleTrainingReplay,
      closeRoleTrainingReplay,
      roleTrainingReplayOpen,
      updateProfile,
      updateWorkspace,
      getUnifiedWorkItemById,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
