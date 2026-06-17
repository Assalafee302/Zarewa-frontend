import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Settings2, Trash2, UserPlus } from 'lucide-react';
import { ModalFrame } from '../layout';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { WORKSPACE_DEPARTMENT_LABELS } from '../../lib/departmentWorkspace';
import { useWorkspace } from '../../context/WorkspaceContext';
import { APP_DATA_TABLE_PAGE_SIZE, useAppTablePaging } from '../../lib/appDataTable';
import { AppTablePager } from '../ui/AppDataTable';
import { EditSecondApprovalInline } from '../EditSecondApprovalInline';
import { useTrackedUnsavedForm } from '../../hooks/useTrackedUnsavedForm';

/**
 * Admin UI: assign role, status, and granular permissions (settings.view).
 * @param {{ appUsers: object[]; currentUserId?: string; onRefresh?: () => Promise<unknown> }} props
 */
export default function TeamAccessPanel({ appUsers, currentUserId, onRefresh }) {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const branches = useMemo(
    () => ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [],
    [ws?.snapshot?.workspaceBranches, ws?.session?.branches]
  );
  const branchNameById = useMemo(() => {
    const m = {};
    for (const b of branches) {
      if (b?.id) m[b.id] = b.name || b.code || b.id;
    }
    return m;
  }, [branches]);

  const sortedAppUsers = useMemo(() => {
    const list = Array.isArray(appUsers) ? [...appUsers] : [];
    list.sort((a, b) => {
      const ba = String(a.branchId || '\uffff');
      const bb = String(b.branchId || '\uffff');
      if (ba !== bb) return ba.localeCompare(bb);
      return String(a.username || '').localeCompare(String(b.username || ''));
    });
    return list;
  }, [appUsers]);

  const [rolesMeta, setRolesMeta] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [rowBusyId, setRowBusyId] = useState('');

  const [permModalUser, setPermModalUser] = useState(null);
  const [draftPerms, setDraftPerms] = useState([]);
  const [fullAccess, setFullAccess] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [userEditAidById, setUserEditAidById] = useState({});
  const [permModalEditApprovalId, setPermModalEditApprovalId] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [zeroAuditLoading, setZeroAuditLoading] = useState(true);
  const [zeroAuditCandidates, setZeroAuditCandidates] = useState([]);
  const [zeroAuditSummary, setZeroAuditSummary] = useState(null);
  const [zeroAuditConfirmPhrase, setZeroAuditConfirmPhrase] = useState('');
  const [zeroAuditConfirmInput, setZeroAuditConfirmInput] = useState('');
  const [zeroAuditBusy, setZeroAuditBusy] = useState(false);
  const [zeroAuditShowList, setZeroAuditShowList] = useState(false);
  const [zeroAuditLastFailed, setZeroAuditLastFailed] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    displayName: '',
    password: '',
    roleKey: 'sales_staff',
    branchId: '',
  });
  const roleKey = String(ws?.session?.user?.roleKey || '').toLowerCase();
  const canManagePasswords = ['admin', 'md', 'hr_admin'].includes(roleKey);

  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [passwordModalValue, setPasswordModalValue] = useState('');
  const [passwordModalBusy, setPasswordModalBusy] = useState(false);

  const { captureEdited: captureCreateEdited, wrapClose: wrapCreateClose } = useTrackedUnsavedForm(
    'settings-create-user',
    { isOpen: createOpen, hydrateKey: 'create-user' }
  );
  const { captureEdited: capturePermEdited, wrapClose: wrapPermClose } = useTrackedUnsavedForm(
    'settings-user-perms',
    { isOpen: Boolean(permModalUser), hydrateKey: permModalUser?.id || 'perms' }
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMetaLoading(true);
      const { ok, data } = await apiFetch('/api/roles');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not load roles.', { variant: 'error' });
        setMetaLoading(false);
        return;
      }
      setRolesMeta(Array.isArray(data.roles) ? data.roles : []);
      setPermissionKeys(Array.isArray(data.permissionKeys) ? data.permissionKeys : []);
      setMetaLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const roleOptions = useMemo(() => {
    if (rolesMeta.length) return rolesMeta;
    const keys = [...new Set(appUsers.map((u) => String(u.roleKey || '')))].filter(Boolean).sort();
    return keys.map((key) => ({ key, label: key, permissions: [] }));
  }, [rolesMeta, appUsers]);

  const roleLabelByKey = useMemo(() => {
    const m = new Map();
    for (const r of roleOptions) {
      m.set(r.key, r.label || r.key);
    }
    return m;
  }, [roleOptions]);

  const permissionsForRoleKey = useCallback(
    (roleKey) => {
      const r = roleOptions.find((x) => x.key === roleKey);
      return r?.permissions ? [...r.permissions] : [];
    },
    [roleOptions]
  );

  const sortedKeysForUi = useMemo(() => {
    return [...permissionKeys].sort((a, b) => {
      if (a === '*') return -1;
      if (b === '*') return 1;
      return a.localeCompare(b);
    });
  }, [permissionKeys]);

  const userPage = useAppTablePaging(
    sortedAppUsers,
    APP_DATA_TABLE_PAGE_SIZE,
    sortedAppUsers?.length
  );
  const pagedUsers = userPage.slice;

  const refresh = async () => {
    try {
      await onRefresh?.();
    } catch {
      /* ignore */
    }
  };

  const loadZeroAuditCandidates = useCallback(async () => {
    setZeroAuditLoading(true);
    try {
      const { ok, data } = await apiFetch('/api/users/zero-audit-candidates');
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not scan unused logins.', { variant: 'error' });
        return;
      }
      setZeroAuditCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setZeroAuditSummary(data.summary || null);
      setZeroAuditConfirmPhrase(String(data.confirmPhrase || '').trim());
    } finally {
      setZeroAuditLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (metaLoading) return;
    void loadZeroAuditCandidates();
  }, [metaLoading, loadZeroAuditCandidates]);

  const patchRole = async (user, nextRoleKey) => {
    if (!user?.id || nextRoleKey === user.roleKey) return;
    setRowBusyId(user.id);
    try {
      const aid = String(userEditAidById[user.id] || '').trim();
      const { ok, data } = await apiFetch(`/api/users/${encodeURIComponent(user.id)}/role`, {
        method: 'PATCH',
        body: JSON.stringify({
          roleKey: nextRoleKey,
          ...(aid ? { editApprovalId: aid } : {}),
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not update role.', { variant: 'error' });
        return;
      }
      showToast('Role updated. Custom permission overrides were cleared; the user’s access now follows the role.');
      await refresh();
    } finally {
      setRowBusyId('');
    }
  };

  const patchWorkspaceBranch = async (user, nextBranchId) => {
    if (!user?.id || !nextBranchId || nextBranchId === user.branchId) return;
    setRowBusyId(user.id);
    try {
      const { ok, data } = await apiFetch(
        `/api/workspace/app-users/${encodeURIComponent(user.id)}/workspace-branch`,
        {
          method: 'PATCH',
          body: JSON.stringify({ branchId: nextBranchId }),
        }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not update home branch.', { variant: 'error' });
        return;
      }
      showToast('Home branch updated.');
      await refresh();
    } finally {
      setRowBusyId('');
    }
  };

  const patchStatus = async (user, nextStatus) => {
    if (!user?.id || nextStatus === user.status) return;
    setRowBusyId(user.id);
    try {
      const aid = String(userEditAidById[user.id] || '').trim();
      const { ok, data } = await apiFetch(`/api/users/${encodeURIComponent(user.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          ...(aid ? { editApprovalId: aid } : {}),
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not update status.', { variant: 'error' });
        return;
      }
      showToast(
        nextStatus === 'suspended'
          ? 'User suspended. Active sessions for this account were ended.'
          : 'User reactivated.'
      );
      await refresh();
    } finally {
      setRowBusyId('');
    }
  };

  const openPasswordModal = (user) => {
    setPasswordModalUser(user);
    setPasswordModalValue('');
  };

  const closePasswordModal = () => {
    if (passwordModalBusy) return;
    setPasswordModalUser(null);
    setPasswordModalValue('');
  };

  const submitSetPassword = async (e) => {
    e.preventDefault();
    if (!passwordModalUser?.id) return;
    const password = String(passwordModalValue || '').trim();
    if (!password) {
      showToast('Password is required.', { variant: 'error' });
      return;
    }
    setPasswordModalBusy(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/users/${encodeURIComponent(passwordModalUser.id)}/password`,
        {
          method: 'PATCH',
          body: JSON.stringify({ password }),
        }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not set password.', { variant: 'error' });
        return;
      }
      showToast(
        `Password updated for ${passwordModalUser.username}. Share it securely—they must change it on next sign-in.`
      );
      closePasswordModal();
      await refresh();
    } finally {
      setPasswordModalBusy(false);
    }
  };

  const openPermModal = (user) => {
    setPermModalEditApprovalId('');
    const perms = Array.isArray(user.permissions) ? [...user.permissions] : [];
    const isStar = perms.includes('*');
    setPermModalUser(user);
    setFullAccess(isStar);
    setDraftPerms(isStar ? ['*'] : perms.length ? perms : permissionsForRoleKey(user.roleKey));
  };

  const closePermModal = () => {
    setPermModalUser(null);
    setPermModalEditApprovalId('');
    setDraftPerms([]);
    setFullAccess(false);
    setPermSaving(false);
  };

  const applyRoleTemplate = () => {
    if (!permModalUser) return;
    const next = permissionsForRoleKey(permModalUser.roleKey);
    setFullAccess(next.includes('*'));
    setDraftPerms(next.includes('*') ? ['*'] : [...next]);
  };

  const togglePermKey = (key) => {
    if (fullAccess) return;
    setDraftPerms((prev) => {
      const set = new Set(prev.filter((p) => p !== '*'));
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return [...set].sort((a, b) => a.localeCompare(b));
    });
  };

  const savePermissions = async () => {
    if (!permModalUser?.id) return;
    const next = fullAccess ? ['*'] : draftPerms.filter(Boolean);
    if (next.length === 0) {
      showToast('Choose full access or at least one permission.', { variant: 'error' });
      return;
    }
    setPermSaving(true);
    try {
      const aid = String(permModalEditApprovalId || '').trim();
      const { ok, data } = await apiFetch(
        `/api/users/${encodeURIComponent(permModalUser.id)}/permissions`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            permissions: next,
            ...(aid ? { editApprovalId: aid } : {}),
          }),
        }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not save permissions.', { variant: 'error' });
        return;
      }
      showToast('Permissions saved. The user may need to refresh the app or sign in again to see all changes.');
      closePermModal();
      await refresh();
    } finally {
      setPermSaving(false);
    }
  };

  const isSelf = (id) => Boolean(currentUserId && id === currentUserId);

  const openDeleteModal = (user) => {
    setDeleteTarget(user);
    setDeleteConfirmInput('');
  };

  const closeDeleteModal = () => {
    if (deleteBusy) return;
    setDeleteTarget(null);
    setDeleteConfirmInput('');
  };

  const submitDeleteUser = async () => {
    if (!deleteTarget?.id) return;
    const expected = String(deleteTarget.username || '').trim().toLowerCase();
    const typed = String(deleteConfirmInput || '').trim().toLowerCase();
    if (!typed || typed !== expected) {
      showToast('Type the username exactly to confirm deletion.', { variant: 'error' });
      return;
    }
    setDeleteBusy(true);
    try {
      const aid = String(userEditAidById[deleteTarget.id] || '').trim();
      const { ok, data } = await apiFetch(`/api/users/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
        body: JSON.stringify({
          confirmUsername: typed,
          ...(aid ? { editApprovalId: aid } : {}),
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not delete user.', { variant: 'error' });
        return;
      }
      showToast('User deleted.');
      setDeleteTarget(null);
      setDeleteConfirmInput('');
      await refresh();
    } finally {
      setDeleteBusy(false);
    }
  };

  const submitBulkDeleteZeroAudit = async () => {
    const expected = String(zeroAuditConfirmPhrase || '').trim();
    const typed = String(zeroAuditConfirmInput || '').trim();
    if (!expected || typed !== expected) {
      showToast(`Type exactly: ${expected || 'DELETE UNUSED LOGINS'}`, { variant: 'error' });
      return;
    }
    const count = zeroAuditCandidates.length;
    if (!count) {
      showToast('No unused logins to delete.', { variant: 'info' });
      return;
    }
    if (
      !window.confirm(
        `Permanently delete ${count} login(s) that have never appeared in the audit trail?\n\nAdmin and MD accounts are never included. This cannot be undone.`
      )
    ) {
      return;
    }
    setZeroAuditBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/users/bulk-delete-zero-audit', {
        method: 'POST',
        body: JSON.stringify({ confirmPhrase: typed, dryRun: false }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Bulk delete failed.', { variant: 'error' });
        return;
      }
      const deleted = data.summary?.deleted ?? (Array.isArray(data.deleted) ? data.deleted.length : 0);
      const failedRows = Array.isArray(data.failed) ? data.failed : [];
      const failed = data.summary?.failed ?? failedRows.length;
      setZeroAuditLastFailed(failedRows);
      showToast(
        failed
          ? `Removed ${deleted} unused login(s). ${failed} could not be deleted — see details below.`
          : `Removed ${deleted} unused login(s).`,
        { variant: failed ? 'info' : 'success' }
      );
      setZeroAuditConfirmInput('');
      await refresh();
      await loadZeroAuditCandidates();
    } finally {
      setZeroAuditBusy(false);
    }
  };

  const submitCreateUser = async (e) => {
    e.preventDefault();
    const username = createForm.username.trim().toLowerCase();
    const displayName = createForm.displayName.trim();
    const branchId = createForm.branchId.trim();
    if (!username || !displayName || !createForm.password) {
      showToast('Username, display name, and password are required.', { variant: 'error' });
      return;
    }
    if (branches.length > 0 && !branchId) {
      showToast('Choose a home branch for this user.', { variant: 'error' });
      return;
    }
    setCreateBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username,
          displayName,
          password: createForm.password,
          roleKey: createForm.roleKey,
          ...(branchId ? { branchId } : {}),
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not create user.', { variant: 'error' });
        return;
      }
      showToast(
        'User created. Share the temporary password securely—they must change it on first sign-in, then complete the role training guide.'
      );
      setCreateOpen(false);
      setCreateForm({
        username: '',
        displayName: '',
        password: '',
        roleKey: 'sales_staff',
        branchId: branches[0]?.id || '',
      });
      await refresh();
    } finally {
      setCreateBusy(false);
    }
  };

  if (metaLoading) {
    return (
      <div className="rounded-3xl border border-slate-200/90 bg-white p-8 text-center text-sm text-slate-500">
        Loading roles…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <h3 className="z-section-title flex items-center gap-2">
          <Settings2 size={14} /> Team & access
        </h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Assign roles and status, and fine-tune permissions when needed. You can permanently delete a login after
          typing their username (same safety rules as suspending privileged admins apply). Changing a role clears
          custom permission overrides and applies that role’s template. The team role is the same value stored as
          workspace “department” for routing shortcuts. New users sign in with the temporary password you set here;
          they choose a new password on first sign-in. Use <strong>Set password</strong> to reset a login (passwords
          are never displayed here).
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCreateForm((f) => ({
                ...f,
                roleKey: roleOptions[0]?.key || f.roleKey,
                branchId: f.branchId || branches[0]?.id || '',
              }));
              setCreateOpen(true);
            }}
            className="z-btn-primary gap-2 !text-[11px]"
          >
            <UserPlus size={16} /> Create user
          </button>
        </div>

        {appUsers.length === 0 ? (
          <p className="text-sm text-slate-500">No users in the directory snapshot.</p>
        ) : (
          <div className="z-scroll-x overflow-x-auto rounded-2xl border border-slate-200/90">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2.5">User</th>
                  <th className="px-3 py-2.5">Branch</th>
                  <th className="px-3 py-2.5">Role</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Permissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedUsers.map((user) => {
                  const busy = rowBusyId === user.id;
                  const userBranchId = String(user.branchId || '').trim();
                  const branchInList = userBranchId && branches.some((b) => b.id === userBranchId);
                  const who = `${user.displayName} · ${user.username}${user.hasCustomPermissions ? ' · custom perms' : ''}`;
                  return (
                    <Fragment key={user.id}>
                      <tr className="bg-white/90 hover:bg-teal-50/30">
                      <td className="px-3 py-3 align-middle max-w-[14rem] whitespace-nowrap truncate" title={who}>
                        <span className="font-bold text-slate-800">{user.displayName}</span>
                        <span className="text-slate-500"> · </span>
                        <span className="font-mono text-xs text-slate-600">{user.username}</span>
                        {user.hasCustomPermissions ? (
                          <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                            Custom
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        {branches.length === 0 ? (
                          <span className="text-xs text-slate-400" title="Load branches from workspace snapshot">
                            —
                          </span>
                        ) : (
                          <select
                            className="z-input !py-1.5 !text-[11px] max-w-[11rem]"
                            value={userBranchId}
                            disabled={busy}
                            onChange={(e) => void patchWorkspaceBranch(user, e.target.value)}
                          >
                            <option value="" disabled={Boolean(userBranchId)}>
                              {userBranchId ? 'Select branch…' : 'Assign branch…'}
                            </option>
                            {!branchInList && userBranchId ? (
                              <option value={userBranchId}>
                                {branchNameById[userBranchId] || userBranchId}
                              </option>
                            ) : null}
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {branchNameById[b.id] || b.id}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <select
                          className="z-input !py-1.5 !text-[11px] max-w-[11rem]"
                          value={user.roleKey}
                          disabled={busy}
                          onChange={(e) => void patchRole(user, e.target.value)}
                        >
                          {roleOptions.map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <select
                          className="z-input !py-1.5 !text-[11px] max-w-[9rem]"
                          value={user.status}
                          disabled={busy || isSelf(user.id)}
                          title={isSelf(user.id) ? 'Use another administrator to suspend your account.' : ''}
                          onChange={(e) => void patchStatus(user, e.target.value)}
                        >
                          <option value="active">active</option>
                          <option value="suspended">suspended</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 align-middle whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openPermModal(user)}
                            className="z-btn-secondary !px-3 !py-1.5 !text-[10px] gap-1"
                          >
                            <Settings2 size={14} /> Edit
                          </button>
                          {canManagePasswords ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openPasswordModal(user)}
                              className="z-btn-secondary !px-3 !py-1.5 !text-[10px]"
                              title="Set a new password (user must change it on next sign-in)"
                            >
                              Set password
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy || isSelf(user.id)}
                            title={
                              isSelf(user.id)
                                ? 'You cannot delete your own account from here.'
                                : 'Permanently delete this login'
                            }
                            onClick={() => openDeleteModal(user)}
                            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={14} aria-hidden />
                            <span className="sr-only">Delete user</span>
                          </button>
                        </div>
                      </td>
                      </tr>
                      <tr className="bg-slate-50/80">
                        <td
                          colSpan={5}
                          className="px-3 py-2 border-b border-slate-100"
                        >
                          <EditSecondApprovalInline
                            entityKind="user"
                            entityId={user.id}
                            value={userEditAidById[user.id] || ''}
                            onChange={(v) => setUserEditAidById((prev) => ({ ...prev, [user.id]: v }))}
                            className="!p-2"
                          />
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {appUsers.length > 0 ? (
          <AppTablePager
            showingFrom={userPage.showingFrom}
            showingTo={userPage.showingTo}
            total={userPage.total}
            hasPrev={userPage.hasPrev}
            hasNext={userPage.hasNext}
            onPrev={userPage.goPrev}
            onNext={userPage.goNext}
          />
        ) : null}
      </div>

      <div className="rounded-3xl border border-rose-200/90 bg-rose-50/30 p-6 shadow-sm">
        <h3 className="z-section-title flex items-center gap-2 text-rose-950">
          <AlertTriangle size={14} /> Remove unused logins
        </h3>
        <p className="text-xs text-rose-900/80 mb-4 leading-relaxed">
          Bulk-delete accounts that have <strong>zero audit trail activity</strong> — they were created but never
          signed in or performed any tracked action. Checks include main audit log, HR audit events, and approval
          actions. <strong>Admin</strong> and <strong>MD</strong> accounts are always skipped, as is your own login.
          HR staff profiles linked to these logins are removed too.
        </p>

        {zeroAuditLoading ? (
          <p className="text-sm text-rose-900/70">Scanning for unused logins…</p>
        ) : (
          <>
            <p className="text-sm text-rose-950 mb-3">
              {zeroAuditCandidates.length ? (
                <>
                  <span className="font-bold">{zeroAuditCandidates.length}</span> login
                  {zeroAuditCandidates.length === 1 ? '' : 's'} can be removed
                  {zeroAuditSummary?.withHrProfile ? (
                    <span className="text-rose-900/80">
                      {' '}
                      ({zeroAuditSummary.withHrProfile} with HR profile)
                    </span>
                  ) : null}
                  .
                </>
              ) : (
                'No unused logins found — every non-protected account has audit trail activity.'
              )}
            </p>

            {zeroAuditCandidates.length > 0 ? (
              <>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-rose-800 underline underline-offset-2 mb-3"
                  onClick={() => setZeroAuditShowList((v) => !v)}
                >
                  {zeroAuditShowList ? 'Hide list' : `Show all ${zeroAuditCandidates.length} usernames`}
                </button>

                {zeroAuditShowList ? (
                  <div className="mb-4 max-h-40 overflow-y-auto rounded-xl border border-rose-200/80 bg-white/80 p-3">
                    <ul className="space-y-1 text-[11px] font-mono text-rose-950">
                      {zeroAuditCandidates.map((c) => (
                        <li key={c.userId}>
                          {c.username}
                          {c.hasHrProfile ? ' · HR' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="space-y-2 max-w-md">
                  <label className="z-field-label text-rose-950">
                    Type <span className="font-mono">{zeroAuditConfirmPhrase || 'DELETE UNUSED LOGINS'}</span> to
                    confirm
                  </label>
                  <input
                    className="z-input"
                    value={zeroAuditConfirmInput}
                    onChange={(e) => setZeroAuditConfirmInput(e.target.value)}
                    disabled={zeroAuditBusy}
                    autoComplete="off"
                    placeholder={zeroAuditConfirmPhrase || 'DELETE UNUSED LOGINS'}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="z-btn-secondary !text-[11px]"
                    disabled={zeroAuditBusy}
                    onClick={() => void loadZeroAuditCandidates()}
                  >
                    Rescan
                  </button>
                  <button
                    type="button"
                    className="z-btn-primary !text-[11px] !bg-rose-700 hover:!bg-rose-800 gap-2"
                    disabled={zeroAuditBusy || !zeroAuditCandidates.length}
                    onClick={() => void submitBulkDeleteZeroAudit()}
                  >
                    <Trash2 size={14} />
                    {zeroAuditBusy ? 'Deleting…' : `Delete ${zeroAuditCandidates.length} unused login(s)`}
                  </button>
                </div>

                {zeroAuditLastFailed.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-950">
                    <p className="font-bold mb-1">Could not delete ({zeroAuditLastFailed.length})</p>
                    <ul className="space-y-1 font-mono max-h-32 overflow-y-auto">
                      {zeroAuditLastFailed.slice(0, 12).map((f) => (
                        <li key={f.userId || f.username}>
                          {f.username}: {f.error}
                        </li>
                      ))}
                    </ul>
                    {zeroAuditLastFailed.length > 12 ? (
                      <p className="mt-1 text-amber-800">…and {zeroAuditLastFailed.length - 12} more.</p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                className="z-btn-secondary !text-[11px]"
                disabled={zeroAuditBusy}
                onClick={() => void loadZeroAuditCandidates()}
              >
                Rescan
              </button>
            )}
          </>
        )}
      </div>

      <ModalFrame
        isOpen={createOpen}
        onClose={wrapCreateClose(() => {
          if (!createBusy) setCreateOpen(false);
        })}
        closeDisabled={createBusy}
        title="Create app user"
        description="Creates a login with a temporary password. Password must be at least 8 characters with mixed case, a number, and a special character."
      >
        <form
          onSubmit={submitCreateUser}
          onInput={captureCreateEdited}
          onChange={captureCreateEdited}
          className="w-full max-w-md rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-xl space-y-3"
        >
          <div>
            <label className="z-field-label">Username</label>
            <input
              className="z-input"
              value={createForm.username}
              onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
              autoComplete="off"
              disabled={createBusy}
            />
          </div>
          <div>
            <label className="z-field-label">Display name</label>
            <input
              className="z-input"
              value={createForm.displayName}
              onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
              autoComplete="off"
              disabled={createBusy}
            />
          </div>
          <div>
            <label className="z-field-label">Initial password</label>
            <input
              type="password"
              className="z-input"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
              disabled={createBusy}
            />
          </div>
          <div>
            <label className="z-field-label">Role</label>
            <select
              className="z-input"
              value={createForm.roleKey}
              onChange={(e) => setCreateForm((f) => ({ ...f, roleKey: e.target.value }))}
              disabled={createBusy}
            >
              {roleOptions.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {branches.length > 0 ? (
            <div>
              <label className="z-field-label">Home branch</label>
              <select
                className="z-input"
                value={createForm.branchId || branches[0]?.id || ''}
                onChange={(e) => setCreateForm((f) => ({ ...f, branchId: e.target.value }))}
                disabled={createBusy}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {branchNameById[b.id] || b.id}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-500 leading-snug">
                Stored on the user record and used to pin workspace data for this login (unless they have HQ
                multi-branch access).
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              No branches in the workspace snapshot. Open Settings → Organisation after branches sync, then create
              users so each login has a home branch.
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-end pt-2">
            <button
              type="button"
              className="z-btn-secondary !text-[11px]"
              disabled={createBusy}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="z-btn-primary !text-[11px]" disabled={createBusy}>
              {createBusy ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </ModalFrame>

      <ModalFrame
        isOpen={Boolean(deleteTarget)}
        onClose={closeDeleteModal}
        closeDisabled={deleteBusy}
        title={deleteTarget ? `Delete user — ${deleteTarget.displayName}` : 'Delete user'}
        description="This removes the login and ends all sessions. Type their username below to confirm. If your role requires it, paste an approved edit ID from the row above first."
      >
        {deleteTarget ? (
          <div className="w-full max-w-md rounded-[28px] border border-red-100 bg-white p-6 shadow-xl space-y-4">
            <p className="text-sm text-slate-700">
              Username to remove:{' '}
              <span className="font-mono font-semibold text-slate-900">{deleteTarget.username}</span>
            </p>
            <div>
              <label className="z-field-label">Type username to confirm</label>
              <input
                className="z-input font-mono"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                autoComplete="off"
                disabled={deleteBusy}
                placeholder={deleteTarget.username}
              />
            </div>
            <EditSecondApprovalInline
              entityKind="user"
              entityId={deleteTarget.id}
              value={userEditAidById[deleteTarget.id] || ''}
              onChange={(v) => setUserEditAidById((prev) => ({ ...prev, [deleteTarget.id]: v }))}
              className="!p-2"
            />
            <div className="flex flex-wrap gap-2 justify-end pt-1">
              <button
                type="button"
                className="z-btn-secondary !text-[11px]"
                disabled={deleteBusy}
                onClick={closeDeleteModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl border border-red-300 bg-red-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
                disabled={deleteBusy}
                onClick={() => void submitDeleteUser()}
              >
                {deleteBusy ? 'Deleting…' : 'Delete user'}
              </button>
            </div>
          </div>
        ) : null}
      </ModalFrame>

      <ModalFrame
        isOpen={Boolean(passwordModalUser)}
        onClose={closePasswordModal}
        closeDisabled={passwordModalBusy}
        title={passwordModalUser ? `Set password — ${passwordModalUser.displayName}` : 'Set password'}
        description="Sets a new login password and ends active sessions. The user must replace it on their next sign-in."
      >
        {passwordModalUser ? (
          <form
            onSubmit={(e) => void submitSetPassword(e)}
            className="w-full max-w-md rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-xl space-y-3"
          >
            <p className="text-[11px] text-slate-500">
              Username:{' '}
              <span className="font-mono font-semibold text-slate-800">{passwordModalUser.username}</span>
            </p>
            <div>
              <label className="z-field-label">New password</label>
              <input
                type="password"
                className="z-input"
                value={passwordModalValue}
                onChange={(e) => setPasswordModalValue(e.target.value)}
                autoComplete="new-password"
                disabled={passwordModalBusy}
                placeholder="At least 8 characters with mixed case, number, symbol"
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <button
                type="button"
                className="z-btn-secondary !text-[11px]"
                disabled={passwordModalBusy}
                onClick={closePasswordModal}
              >
                Cancel
              </button>
              <button type="submit" className="z-btn-primary !text-[11px]" disabled={passwordModalBusy}>
                {passwordModalBusy ? 'Saving…' : 'Set password'}
              </button>
            </div>
          </form>
        ) : null}
      </ModalFrame>

      <ModalFrame
        isOpen={Boolean(permModalUser)}
        onClose={wrapPermClose(closePermModal)}
        title={permModalUser ? `Permissions — ${permModalUser.displayName}` : 'Permissions'}
        description="Choose full access or individual permissions. Save applies to this login only."
      >
        <div
          className="w-full max-w-lg rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-xl"
          onInput={capturePermEdited}
          onChange={capturePermEdited}
        >
          <p className="text-[11px] text-slate-500 mb-4">
            Role:{' '}
            <span className="font-semibold text-slate-800">
              {permModalUser ? roleLabelByKey.get(permModalUser.roleKey) || permModalUser.roleKey : ''}
            </span>
          </p>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[11px] font-medium text-slate-700 mb-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#134e4a]"
              checked={fullAccess}
              onChange={(e) => {
                const on = e.target.checked;
                setFullAccess(on);
                if (on) setDraftPerms(['*']);
                else if (permModalUser)
                  setDraftPerms(permissionsForRoleKey(permModalUser.roleKey).filter((p) => p !== '*'));
              }}
            />
            Full access (all modules) — <code className="text-[10px]">*</code>
          </label>

          {!fullAccess ? (
            <div className="max-h-[min(52vh,420px)] overflow-y-auto rounded-xl border border-slate-200/90 bg-slate-50/50 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {sortedKeysForUi
                  .filter((k) => k !== '*')
                  .map((key) => (
                    <label
                      key={key}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 accent-[#134e4a] shrink-0"
                        checked={draftPerms.includes(key)}
                        onChange={() => togglePermKey(key)}
                      />
                      <span className="font-mono leading-snug break-all">{key}</span>
                    </label>
                  ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 mb-3">All other permission toggles are ignored while full access is on.</p>
          )}

          {permModalUser?.id ? (
            <EditSecondApprovalInline
              entityKind="user"
              entityId={permModalUser.id}
              value={permModalEditApprovalId}
              onChange={setPermModalEditApprovalId}
              className="mt-4"
            />
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2 justify-end">
            <button type="button" onClick={applyRoleTemplate} className="z-btn-secondary !text-[11px]">
              Apply role template
            </button>
            <button type="button" onClick={closePermModal} className="z-btn-secondary !text-[11px]">
              Cancel
            </button>
            <button
              type="button"
              disabled={permSaving}
              onClick={() => void savePermissions()}
              className="z-btn-primary !text-[11px]"
            >
              {permSaving ? 'Saving…' : 'Save permissions'}
            </button>
          </div>
        </div>
      </ModalFrame>
    </div>
  );
}
