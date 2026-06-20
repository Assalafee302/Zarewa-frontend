/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, apiUrl } from '../lib/apiBase';
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
import {
  clearPendingPasswordChange,
  hasPendingPasswordChange,
  markPendingPasswordChange,
  withPendingPasswordSession,
} from '../lib/pendingPasswordChange.js';

const WorkspaceContext = createContext(null);

const BOOTSTRAP_CACHE_KEY_PREFIX = 'zarewa.bootstrap.cache.v4';

function bootstrapCacheKey(session) {
  const uid = String(session?.user?.id || 'anon').trim() || 'anon';
  const bid = String(session?.currentBranchId || 'default').trim() || 'default';
  const all = session?.viewAllBranches ? ':all' : '';
  return `${BOOTSTRAP_CACHE_KEY_PREFIX}:${uid}:${bid}${all}`;
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
  return 60_000;
}

function readBootstrapCache(session) {
  try {
    const raw = sessionStorage.getItem(bootstrapCacheKey(session));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.ok) return null;
    if (!data.session?.user) return null;
    return data;
  } catch {
    return null;
  }
}

function writeBootstrapCache(data) {
  try {
    if (data?.ok && data?.session?.user) {
      sessionStorage.setItem(bootstrapCacheKey(data.session), JSON.stringify(sanitizeBootstrapForCache(data)));
    }
  } catch {
    /* ignore */
  }
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
  if (hasPendingPasswordChange(nextUser.id) && !nextUser.mustChangePassword) {
    return {
      ...normalized,
      session: {
        ...normalized.session,
        user: { ...nextUser, mustChangePassword: true },
      },
    };
  }
  if (!prevUser?.id || String(prevUser.id) !== String(nextUser.id)) {
    return normalized;
  }
  let user = nextUser;
  let changed = false;
  if (prevUser.mustChangePassword && nextUser.mustChangePassword !== false) {
    if (!nextUser.mustChangePassword) {
      user = { ...user, mustChangePassword: true };
      changed = true;
    }
  }
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
  const [status, setStatus] = useState('checking');
  const [snapshot, setSnapshot] = useState(null);
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
  const loadedDomainsRef = useRef(new Set());
  const fullBootstrapLoadedRef = useRef(false);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const applySnapshot = useCallback((data, mode = 'ok') => {
    let merged = null;
    setSnapshot((prev) => {
      merged = mergeSessionOnboardingFlags(prev, withPendingPasswordSession(data));
      const uid = merged?.session?.user?.id;
      if (uid && merged.session.user?.mustChangePassword) {
        markPendingPasswordChange(uid);
      }
      return merged;
    });
    setStatus(mode);
    setLastError(null);
    if (Array.isArray(merged?.ledgerEntries)) {
      replaceLedgerEntries(merged.ledgerEntries);
    }
    if (mode === 'ok' && merged) {
      writeBootstrapCache(merged);
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
   * After PATCH /api/quotations/:id, merge the returned row into the live snapshot so paidNgn /
   * paymentStatus (recalculated on the server from receipts) update immediately without waiting on bootstrap.
   */
  const mergeQuotationIntoSnapshot = useCallback((quotation) => {
    if (!quotation?.id) return;
    setSnapshot((prev) => {
      if (!prev || !Array.isArray(prev.quotations) || prev.ok !== true) return prev;
      const id = String(quotation.id);
      const idx = prev.quotations.findIndex((q) => String(q.id) === id);
      if (idx < 0) return prev;
      const nextQuotations = [...prev.quotations];
      const merged = { ...nextQuotations[idx], ...quotation };
      if (merged.customer) merged.customer = formatPersonName(merged.customer);
      nextQuotations[idx] = merged;
      const next = { ...prev, quotations: nextQuotations };
      writeBootstrapCache(next);
      return next;
    });
    setRefreshEpoch((n) => n + 1);
  }, []);

  const mergeSnapshotPatch = useCallback((patch) => {
    if (!patch || patch.ok !== true) return null;
    const { domain: _domain, ok: _ok, ...fields } = patch;
    let merged = null;
    setSnapshot((prev) => {
      merged = mergeSessionOnboardingFlags(prev, {
        ...(prev || {}),
        ok: true,
        ...fields,
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
    try {
      const mode = String(opts?.mode ?? '').trim();
      const isPoll = Boolean(opts?.poll);
      const forceFull = Boolean(opts?.forceFull);
      const wantsLight =
        !forceFull &&
        !mode &&
        !isPoll &&
        !fullBootstrapLoadedRef.current &&
        loadedDomainsRef.current.size === 0;
      const effectiveMode = wantsLight ? 'dashboard' : mode;
      const qsParts = [];
      if (effectiveMode) qsParts.push(`mode=${encodeURIComponent(effectiveMode)}`);
      if (isPoll) qsParts.push('poll=1');
      const qs = qsParts.length ? `?${qsParts.join('&')}` : '';
      if (!isPoll) {
        bootstrapPollEtagRef.current = '';
      }
      const etag = isPoll ? bootstrapPollEtagRef.current : bootstrapFullEtagRef.current;
      const r = await fetch(apiUrl(`/api/bootstrap${qs}`), {
        method: 'GET',
        credentials: 'include',
        headers: etag ? { 'If-None-Match': etag } : {},
      });
      if (r.status === 304) {
        return snapshotRef.current;
      }
      const text = await r.text();
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
        const uid = snapshotRef.current?.session?.user?.id;
        if (uid && hasPendingPasswordChange(uid)) {
          setSessionMessage('Session could not be refreshed. Set your new password or sign out and try again.');
          return snapshotRef.current;
        }
        clearBootstrapCache();
        setStatus('auth_required');
        setSnapshot(null);
        setLastError(null);
        loadedDomainsRef.current = new Set();
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
      if (!r.ok || !data?.ok) throw new Error(data?.error || 'Bootstrap failed');
      if (!effectiveMode && !isPoll) {
        fullBootstrapLoadedRef.current = true;
      }
      return applySnapshot(withPendingPasswordSession(data), 'ok');
    } catch (e) {
      const cached = readBootstrapCache(snapshotRef.current?.session);
      if (cached) {
        setLastError(String(e.message || e));
        return applySnapshot(withPendingPasswordSession(cached), 'degraded');
      }
      const uid = snapshotRef.current?.session?.user?.id;
      if (uid && hasPendingPasswordChange(uid)) {
        setLastError(String(e.message || e));
        return snapshotRef.current;
      }
      setStatus('offline');
      setSnapshot(null);
      setLastError(String(e.message || e));
      loadedDomainsRef.current = new Set();
      fullBootstrapLoadedRef.current = false;
      workspaceRevisionEtagRef.current = '';
      return null;
    }
  }, [applySnapshot]);

  const ensureDomainLoaded = useCallback(
    async (domain, opts = {}) => {
      const key = String(domain || '').trim().toLowerCase();
      const force = Boolean(opts?.force);
      if (!key) return snapshotRef.current;
      if (!force && loadedDomainsRef.current.has(key)) return snapshotRef.current;
      try {
        const r = await fetch(apiUrl(`/api/workspace/${encodeURIComponent(key)}-snapshot`), {
          method: 'GET',
          credentials: 'include',
        });
        if (r.status === 304) {
          loadedDomainsRef.current.add(key);
          return snapshotRef.current;
        }
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.ok) return snapshotRef.current;
        loadedDomainsRef.current.delete(key);
        loadedDomainsRef.current.add(key);
        return mergeSnapshotPatch(data) ?? snapshotRef.current;
      } catch {
        return snapshotRef.current;
      }
    },
    [mergeSnapshotPatch]
  );

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
      loadedDomainsRef.current = new Set();
      if (!revRes.ok) {
        await refresh({
          poll: true,
          forceFull: fullBootstrapLoadedRef.current || loadedDomainsRef.current.size > 0,
        });
        return snapshotRef.current;
      }
      const revData = await revRes.json().catch(() => null);
      if (!revData?.ok) {
        await refresh({
          poll: true,
          forceFull: fullBootstrapLoadedRef.current || loadedDomainsRef.current.size > 0,
        });
        return snapshotRef.current;
      }
      return refresh({
        poll: true,
        forceFull: fullBootstrapLoadedRef.current || loadedDomainsRef.current.size > 0,
      });
    } catch {
      return snapshotRef.current;
    }
  }, [refresh]);

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
          loadedDomainsRef.current = new Set();
          fullBootstrapLoadedRef.current = false;
          workspaceRevisionEtagRef.current = '';
          bootstrapPollEtagRef.current = '';
          bootstrapFullEtagRef.current = '';
          await refreshDashboardSummary();
          await refresh({ mode: 'dashboard' });
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
    [applySnapshot, refresh, refreshDashboardSummary]
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
    bootstrapPollEtagRef.current = '';
    bootstrapFullEtagRef.current = '';
    workspaceRevisionEtagRef.current = '';
    loadedDomainsRef.current = new Set();
    fullBootstrapLoadedRef.current = false;
    setSnapshot(null);
    setDashboardSummary(null);
    setDashboardSummaryEtag('');
    setLastError(null);
    setStatus('auth_required');
  }, []);

  const endSessionForTimeout = useCallback(async () => {
    const mins = Number(snapshot?.session?.sessionTimeoutMinutes) || 120;
    try {
      await apiFetch('/api/session/timeout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    replaceLedgerEntries([]);
    clearBootstrapCache();
    bootstrapPollEtagRef.current = '';
    bootstrapFullEtagRef.current = '';
    workspaceRevisionEtagRef.current = '';
    loadedDomainsRef.current = new Set();
    fullBootstrapLoadedRef.current = false;
    setSnapshot(null);
    setDashboardSummary(null);
    setDashboardSummaryEtag('');
    setLastError(null);
    setSessionMessage(`You were signed out after ${mins} minutes of inactivity.`);
    sessionNoticeShownRef.current = true;
    setStatus('auth_required');
  }, [snapshot?.session?.sessionTimeoutMinutes]);

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
      await refresh();
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
      loadedDomainsRef.current = new Set();
      fullBootstrapLoadedRef.current = false;
      workspaceRevisionEtagRef.current = '';
      bootstrapPollEtagRef.current = '';
      bootstrapFullEtagRef.current = '';
      await refresh({ mode: 'dashboard' });
      return { ok: true, data };
    },
    [refresh]
  );

  const getUnifiedWorkItemById = useCallback(
    (workItemId) => {
      const items = Array.isArray(snapshot?.unifiedWorkItems) ? snapshot.unifiedWorkItems : [];
      return items.find((item) => item.id === workItemId || item.referenceNo === workItemId) ?? null;
    },
    [snapshot?.unifiedWorkItems]
  );

  useEffect(() => {
    void refresh({ mode: 'dashboard' });
  }, [refresh]);

  /** Timer + tab focus: cheap revision check, then bootstrap poll only when data changed. */
  useEffect(() => {
    if (status !== 'ok') return undefined;
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
    void refreshEditApprovalsPending();
    const t = setInterval(() => void refreshEditApprovalsPending(), 45000);
    return () => clearInterval(t);
  }, [status, refreshEditApprovalsPending, refreshEpoch]);

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

  useEffect(() => {
    if (status === 'checking' || status === 'auth_required') {
      setStaffPurchaseCreditPendingCount(0);
      setStaffPurchaseCreditCrossBranch(null);
      return;
    }
    void refreshStaffPurchaseCreditPending();
    const t = setInterval(() => void refreshStaffPurchaseCreditPending(), 45000);
    return () => clearInterval(t);
  }, [status, refreshStaffPurchaseCreditPending, refreshEpoch]);

  const canMutate = status === 'ok';
  const usingCachedData = status === 'degraded';
  const hasWorkspaceData = (status === 'ok' || status === 'degraded') && snapshot != null;

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
      ensureFullBootstrap,
      refreshEpoch,
      /** Live server reachable — reads and writes go to API. */
      apiOnline: status === 'ok',
      /** Bootstrap loaded (live or last cached sync in this tab). */
      hasWorkspaceData,
      /** Last successful bootstrap in this browser tab (read-only when server drops). */
      usingCachedData,
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
      ensureFullBootstrap,
      refreshEpoch,
      hasWorkspaceData,
      usingCachedData,
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
