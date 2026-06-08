/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, apiUrl } from '../lib/apiBase';
import { replaceLedgerEntries } from '../lib/customerLedgerStore';
import { canAccessModuleWithPermissions, hasPermissionInList } from '../lib/moduleAccess';
import { userCanApproveEditMutationsClient } from '../lib/editApprovalUi';
import { userMayViewManagementReportsClient } from '../lib/reportsAccess';
import { normalizeWorkspacePersonNames } from '../lib/normalizeWorkspacePersonNames';
import { formatPersonName } from '../lib/formatPersonName';
import {
  branchScopedCreateBlockedMessage,
  isBranchScopedCreateBlocked,
} from '../lib/workspaceBranchCreate';
import { sanitizeWorkItemForCache } from '../lib/workspaceSanitize.js';

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
  return 30000;
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

export function WorkspaceProvider({ children }) {
  const [status, setStatus] = useState('checking');
  const [snapshot, setSnapshot] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [dashboardSummaryEtag, setDashboardSummaryEtag] = useState('');
  const [lastError, setLastError] = useState(null);
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const [editApprovalsPendingCount, setEditApprovalsPendingCount] = useState(0);
  const [roleTrainingReplayOpen, setRoleTrainingReplayOpen] = useState(false);
  const [sessionMessage, setSessionMessage] = useState('');

  const applySnapshot = useCallback((data, mode = 'ok') => {
    const normalized = normalizeWorkspacePersonNames(data);
    setSnapshot(normalized);
    setStatus(mode);
    setLastError(null);
    if (Array.isArray(normalized?.ledgerEntries)) {
      replaceLedgerEntries(normalized.ledgerEntries);
    }
    if (mode === 'ok') {
      writeBootstrapCache(normalized);
    }
    setRefreshEpoch((n) => n + 1);
    return normalized;
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
      const qs = mode ? `?mode=${encodeURIComponent(mode)}` : '';
      const { ok, status: httpStatus, data } = await apiFetch(`/api/bootstrap${qs}`);
      if (httpStatus === 401 || data?.code === 'AUTH_REQUIRED') {
        clearBootstrapCache();
        setStatus('auth_required');
        setSnapshot(null);
        setLastError(null);
        setSessionMessage((prev) => prev || 'Your session has expired. Please sign in again.');
        replaceLedgerEntries([]);
        return null;
      }
      if (data?.code === 'CSRF_INVALID') {
        setSessionMessage('Your session security token expired. Please sign in again.');
      }
      if (!ok || !data?.ok) throw new Error(data?.error || 'Bootstrap failed');
      return applySnapshot(data, 'ok');
    } catch (e) {
      const cached = readBootstrapCache(snapshot?.session);
      if (cached) {
        setLastError(String(e.message || e));
        return applySnapshot(cached, 'degraded');
      }
      setStatus('offline');
      setSnapshot(null);
      setLastError(String(e.message || e));
      return null;
    }
  }, [applySnapshot, snapshot?.session]);

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
        // Fast initial render: dashboard summary + dashboard bootstrap first, then full snapshot.
        await refreshDashboardSummary();
        await refresh({ mode: 'dashboard' });
        setTimeout(() => {
          refreshDashboardSummary();
          refresh();
        }, 0);
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
    [refresh, refreshDashboardSummary]
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
    replaceLedgerEntries([]);
    clearBootstrapCache();
    setSnapshot(null);
    setDashboardSummary(null);
    setDashboardSummaryEtag('');
    setLastError(null);
    setStatus('auth_required');
  }, []);

  const endSessionForTimeout = useCallback(async () => {
    try {
      await apiFetch('/api/session/timeout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    replaceLedgerEntries([]);
    clearBootstrapCache();
    setSnapshot(null);
    setDashboardSummary(null);
    setDashboardSummaryEtag('');
    setLastError(null);
    setSessionMessage('You were signed out after 15 minutes of inactivity.');
    setStatus('auth_required');
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
      return { ok: false, error: data?.error || 'Could not update profile.' };
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
      await refresh();
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
    refresh();
  }, [refresh]);

  /** Timer + tab focus: merge latest bootstrap into state and warm session cache. */
  useEffect(() => {
    if (status !== 'ok') return undefined;
    const ms = workspacePollIntervalMs();
    const pull = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void refresh();
      void refreshDashboardSummary();
    };
    const id = window.setInterval(pull, ms);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
        void refreshDashboardSummary();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, refresh, refreshDashboardSummary]);

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
      mergeQuotationIntoSnapshot,
      login,
      sessionMessage,
      clearSessionMessage,
      endSessionForTimeout,
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
      mergeQuotationIntoSnapshot,
      login,
      sessionMessage,
      clearSessionMessage,
      endSessionForTimeout,
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
