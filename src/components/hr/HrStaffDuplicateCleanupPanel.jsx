import { HrButton } from '../../components/hr/hrPageUi';
import React, { useMemo, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { HR_BTN_SECONDARY } from './hrFormStyles';
import { HrStaffBulkDeleteModal } from './HrStaffBulkDeleteModal';
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

function memberKey(userId, extra) {
  return `${userId}:${extra || ''}`;
}

export function HrStaffDuplicateCleanupPanel({ onCleaned }) {
  const [report, setReport] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
