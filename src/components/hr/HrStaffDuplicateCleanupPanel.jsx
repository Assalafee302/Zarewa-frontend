import { HrButton } from '../../components/hr/hrPageUi';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, GitMerge, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import { HrStaffBulkDeleteModal } from './HrStaffBulkDeleteModal';
import { fetchHrStaffMergeCandidates, mergeHrStaffInto } from '../../lib/hrStaffExtras';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

const IDENTITY_LABEL = {
  nin: 'NIN',
  phone: 'Phone',
  email: 'Email',
  bvn: 'BVN',
  account: 'Account number',
  employeeNo: 'Employee ID',
};

const NAME_REASON = {
  exact: 'Same name',
  same_tokens: 'Same names, different order',
  similar: 'Very similar spelling',
  shared_name_parts: 'Shared name parts',
};

const PROTECTED_ROLES = new Set(['admin', 'md']);

function memberKey(userId, extra) {
  return `${userId}:${extra || ''}`;
}

function asLogin(row) {
  const id = String(row?.userId || row?.id || '').trim();
  if (!id) return null;
  return {
    id,
    username: String(row?.username || '').trim(),
    displayName: String(row?.displayName || row?.display_name || '').trim(),
    roleKey: String(row?.roleKey || row?.role_key || '').trim(),
  };
}

function loginOptionLabel(u) {
  const name = u.displayName || u.username || u.id;
  const role = PROTECTED_ROLES.has(u.roleKey) ? ' · keep this login' : '';
  return `${name} (${u.username || u.id}${role})`;
}

export function HrStaffDuplicateCleanupPanel({ staff = [], onCleaned }) {
  const ws = useWorkspace();
  const me = ws?.session?.user || null;
  const myId = String(me?.id || '').trim();
  const appUsers = ws?.snapshot?.appUsers || [];
  const [report, setReport] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mergeUsers, setMergeUsers] = useState([]);
  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState(myId);
  const [confirmKeep, setConfirmKeep] = useState('');
  const [mergeResult, setMergeResult] = useState(null);

  useEffect(() => {
    if (myId && !toUserId) setToUserId(myId);
  }, [myId, toUserId]);

  useEffect(() => {
    let cancelled = false;
    fetchHrStaffMergeCandidates().then(({ ok, data }) => {
      if (cancelled || !ok || !data?.ok) return;
      setMergeUsers(Array.isArray(data.staff) ? data.staff : []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const logins = useMemo(() => {
    const byId = new Map();
    const add = (row) => {
      const u = asLogin(row);
      if (!u) return;
      const prev = byId.get(u.id);
      byId.set(u.id, {
        ...prev,
        ...u,
        username: u.username || prev?.username || '',
        displayName: u.displayName || prev?.displayName || '',
        roleKey: u.roleKey || prev?.roleKey || '',
      });
    };
    for (const row of mergeUsers) add(row);
    for (const row of staff) add(row);
    for (const row of appUsers) add(row);
    if (me) add({ userId: me.id, username: me.username, displayName: me.displayName, roleKey: me.roleKey });
    return [...byId.values()].sort((a, b) =>
      String(a.displayName || a.username).localeCompare(String(b.displayName || b.username))
    );
  }, [mergeUsers, staff, appUsers, me]);

  const keepLogins = logins;
  const extraLogins = logins.filter((u) => u.id !== myId && !PROTECTED_ROLES.has(u.roleKey));
  const keepLogin = keepLogins.find((u) => u.id === toUserId);
  const extraLogin = extraLogins.find((u) => u.id === fromUserId);
  const keepUsername = String(keepLogin?.username || me?.username || '').trim();
  const confirmOk = confirmKeep.trim().toLowerCase() === keepUsername.toLowerCase() && Boolean(keepUsername);

  const scan = async () => {
    setBusy('scan');
    setError('');
    setResult(null);
    setSelectedIds([]);
    const { ok, data } = await apiFetch('/api/hr/staff-import/duplicates');
    setBusy('');
    if (!ok || !data?.ok) {
      setReport(null);
      setError(data?.error || 'Could not scan for duplicates.');
      return;
    }
    setReport(data);
  };

  const runCleanup = async () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy('cleanup');
    setError('');
    const { ok, data } = await apiFetch('/api/hr/staff-import/duplicates/cleanup', {
      method: 'POST',
      body: JSON.stringify({ dryRun: false }),
    });
    setBusy('');
    setConfirm(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Cleanup failed.');
      return;
    }
    setResult(data);
    setReport(null);
    await onCleaned?.();
    await scan();
  };

  const runMerge = async () => {
    if (!fromUserId || !toUserId) {
      setError('Choose the extra login and the login to keep.');
      return;
    }
    if (!confirmOk) {
      setError(`Type ${keepUsername || 'the keep username'} to confirm.`);
      return;
    }
    setBusy('merge');
    setError('');
    setMergeResult(null);
    const { ok, data } = await mergeHrStaffInto({ fromUserId, toUserId });
    setBusy('');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not merge the two logins.');
      return;
    }
    setMergeResult(data);
    setFromUserId('');
    setConfirmKeep('');
    const list = await fetchHrStaffMergeCandidates();
    if (list.ok && list.data?.ok) setMergeUsers(Array.isArray(list.data.staff) ? list.data.staff : []);
    await onCleaned?.();
  };

  const summary = report?.summary;
  const removals = report?.proposedRemovals || report?.targets || [];
  const identityGroups = report?.identityGroups || [];
  const nameSuspicions = report?.nameSuspicions || [];

  const selectableStaff = useMemo(() => {
    const byId = new Map();
    for (const g of identityGroups) {
      for (const m of g.members || []) byId.set(m.userId, m);
    }
    for (const r of removals) byId.set(r.userId, r);
    for (const g of nameSuspicions) {
      for (const m of g.members || []) byId.set(m.userId, m);
    }
    return [...byId.values()];
  }, [identityGroups, removals, nameSuspicions]);

  const toggleId = (userId) => {
    setSelectedIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
  };

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-4 text-sm text-amber-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-2">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
          <div>
            <p className="font-bold text-amber-950">Find duplicate staff</p>
            <p className="mt-1 text-xs text-amber-900/90">
              Two employees cannot share the same NIN, phone, email, BVN, bank account, or employee ID. Similar names
              are flagged for review only — confirm before deleting. Prefer <strong>Separation / exit</strong> for
              people who left; permanent delete is for extra logins created by mistake.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void scan()} disabled={Boolean(busy)} className={HR_BTN_SECONDARY}>
            {busy === 'scan' ? 'Scanning…' : 'Scan duplicates'}
          </button>
          {selectedIds.length ? (
            <HrButton type="button" variant="destructive" disabled={Boolean(busy)} onClick={() => setDeleteOpen(true)}>
              Delete {selectedIds.length} selected
            </HrButton>
          ) : null}
          {summary?.proposedRemovals > 0 ? (
            <button
              type="button"
              onClick={() => void runCleanup()}
              disabled={Boolean(busy)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide ${
                confirm
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : 'border border-red-200 bg-white text-red-800 hover:bg-red-50'
              }`}
            >
              <Trash2 size={14} aria-hidden />
              {busy === 'cleanup'
                ? 'Removing…'
                : confirm
                  ? 'Confirm remove duplicates'
                  : `Remove ${summary.proposedRemovals} suggested`}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-teal-200 bg-white/90 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-900">
          <GitMerge size={14} aria-hidden />
          Merge two logins
        </p>
        <p className="mt-1 text-xs text-slate-600">
          If you sign in as <strong>admin</strong> and also have a staff file under your real name, keep{' '}
          <strong>admin</strong> and absorb the named login. You will still sign in as admin; the extra login is
          removed and its HR file moves onto admin. You cannot delete or absorb the admin login itself.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-700">
            Absorb (extra login)
            <select
              className={HR_FIELD_CLASS}
              value={fromUserId}
              onChange={(e) => setFromUserId(e.target.value)}
              disabled={Boolean(busy)}
            >
              <option value="">Select the named extra login…</option>
              {extraLogins.map((u) => (
                <option key={u.id} value={u.id}>
                  {loginOptionLabel(u)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            Keep (this login stays)
            <select
              className={HR_FIELD_CLASS}
              value={toUserId}
              onChange={(e) => {
                setToUserId(e.target.value);
                setConfirmKeep('');
              }}
              disabled={Boolean(busy)}
            >
              <option value="">Select the login to keep…</option>
              {keepLogins.map((u) => (
                <option key={u.id} value={u.id}>
                  {loginOptionLabel(u)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block text-xs font-medium text-slate-700">
          Type <span className="font-mono">{keepUsername || 'the keep username'}</span> to confirm
          <input
            className={HR_FIELD_CLASS}
            value={confirmKeep}
            onChange={(e) => setConfirmKeep(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={Boolean(busy) || !keepUsername}
            placeholder={keepUsername || 'username'}
          />
        </label>
        <div className="mt-3">
          <HrButton
            type="button"
            disabled={Boolean(busy) || !fromUserId || !toUserId || !confirmOk}
            onClick={() => void runMerge()}
          >
            {busy === 'merge' ? 'Merging…' : 'Merge into keep login'}
          </HrButton>
        </div>
        {extraLogin && keepLogin ? (
          <p className="mt-2 text-xs text-slate-600">
            {extraLogin.displayName || extraLogin.username} (<span className="font-mono">{extraLogin.username}</span>)
            will be removed. Keep signing in as{' '}
            <span className="font-mono">{keepLogin.username}</span>
            {keepLogin.displayName ? ` (${keepLogin.displayName})` : ''}.
          </p>
        ) : null}
        {mergeResult?.ok ? (
          <p className="mt-2 text-xs font-semibold text-emerald-900">
            Absorbed {mergeResult.fromUsername} into {mergeResult.toUsername}. Keep signing in as{' '}
            {mergeResult.toUsername}.
          </p>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-xs font-semibold text-red-800">{error}</p> : null}

      {summary ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg bg-white/80 px-2 py-1.5">
            <dt className="text-amber-800/80">Identity clashes</dt>
            <dd className="font-black tabular-nums">{summary.identityGroups ?? 0}</dd>
          </div>
          <div className="rounded-lg bg-white/80 px-2 py-1.5">
            <dt className="text-amber-800/80">Name suspicions</dt>
            <dd className="font-black tabular-nums">{summary.nameSuspicions ?? 0}</dd>
          </div>
          <div className="rounded-lg bg-white/80 px-2 py-1.5">
            <dt className="text-amber-800/80">Duplicate emp. ID</dt>
            <dd className="font-black tabular-nums">{summary.duplicateEmployeeNos ?? 0}</dd>
          </div>
          <div className="rounded-lg bg-white/80 px-2 py-1.5">
            <dt className="text-amber-800/80">Same name (import)</dt>
            <dd className="font-black tabular-nums">{summary.duplicateDisplayNames ?? 0}</dd>
          </div>
          <div className="rounded-lg bg-white/80 px-2 py-1.5">
            <dt className="text-amber-800/80">Orphan logins</dt>
            <dd className="font-black tabular-nums">{summary.orphanLogins ?? 0}</dd>
          </div>
          <div className="rounded-lg bg-white/80 px-2 py-1.5">
            <dt className="text-amber-800/80">Suggested removals</dt>
            <dd className="font-black tabular-nums">{summary.proposedRemovals ?? 0}</dd>
          </div>
        </dl>
      ) : null}

      {identityGroups.length ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Shared identity (must be unique)</p>
          {identityGroups.slice(0, 20).map((g, idx) => (
            <div key={`${g.field}-${g.value}-${idx}`} className="rounded-lg border border-amber-100 bg-white/90 p-3">
              <p className="text-xs font-semibold text-red-800">
                Same {IDENTITY_LABEL[g.field] || g.field}
              </p>
              <ul className="mt-2 space-y-1">
                {(g.members || []).map((m) => (
                  <li key={memberKey(m.userId, g.field)} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(m.userId)}
                      onChange={() => toggleId(m.userId)}
                      aria-label={`Select ${m.displayName || m.username}`}
                    />
                    <span className="font-medium">{m.displayName || m.username}</span>
                    <span className="font-mono text-xs text-slate-600">{m.username}</span>
                    {m.employeeNo ? <span className="text-xs text-slate-500">{m.employeeNo}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {nameSuspicions.length ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Similar names (review — not automatic)</p>
          {nameSuspicions.slice(0, 15).map((g, idx) => (
            <div key={`name-${idx}`} className="rounded-lg border border-amber-100 bg-white/90 p-3">
              <p className="text-xs font-semibold text-amber-900">{NAME_REASON[g.reason] || g.reason}</p>
              <ul className="mt-2 space-y-1">
                {(g.members || []).map((m) => (
                  <li key={memberKey(m.userId, `name-${idx}`)} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(m.userId)}
                      onChange={() => toggleId(m.userId)}
                      aria-label={`Select ${m.displayName || m.username}`}
                    />
                    <span className="font-medium">{m.displayName || m.username}</span>
                    <span className="font-mono text-xs text-slate-600">{m.username}</span>
                    {m.employeeNo ? <span className="text-xs text-slate-500">{m.employeeNo}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {removals.length > 0 ? (
        <AppTableWrap className="mt-3 max-h-40 border-amber-100 bg-white/90">
          <AppTable>
            <AppTableThead sticky>
              <AppTableTh>Login</AppTableTh>
              <AppTableTh>Name</AppTableTh>
              <AppTableTh>Reason</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {removals.slice(0, 40).map((r) => (
                <AppTableTr key={r.userId}>
                  <AppTableTd monospace>{r.username}</AppTableTd>
                  <AppTableTd>{r.displayName || '—'}</AppTableTd>
                  <AppTableTd>{String(r.reason || '').replace(/_/g, ' ')}</AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
          {removals.length > 40 ? (
            <p className="px-4 py-2 text-ui-xs text-amber-800">…and {removals.length - 40} more</p>
          ) : null}
        </AppTableWrap>
      ) : null}

      {result?.removed?.length ? (
        <p className="mt-3 text-xs font-semibold text-emerald-900">
          Removed {result.removed.length} duplicate account(s).
          {result.failed?.length ? ` ${result.failed.length} could not be deleted (may be suspended instead).` : ''}
        </p>
      ) : null}

      {confirm ? (
        <p className="mt-2 text-xs text-red-900">
          Click <strong>Confirm remove duplicates</strong> again to permanently delete the suggested extra logins. Tick
          the people you want to remove yourself if you would rather choose.
        </p>
      ) : null}

      <HrStaffBulkDeleteModal
        isOpen={deleteOpen}
        staff={selectableStaff}
        selectedIds={selectedIds}
        onClose={() => setDeleteOpen(false)}
        onDone={async (data) => {
          setDeleteOpen(false);
          setSelectedIds([]);
          setResult({
            removed: data?.deletedStaff || Array.from({ length: data?.deleted || 0 }),
            failed: data?.errors || [],
          });
          await onCleaned?.();
          await scan();
        }}
      />
    </div>
  );
}
