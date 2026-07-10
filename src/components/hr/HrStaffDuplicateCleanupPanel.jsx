import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { HR_BTN_SECONDARY } from './hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

export function HrStaffDuplicateCleanupPanel({ onCleaned }) {
  const [report, setReport] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  const scan = async () => {
    setBusy('scan');
    setError('');
    setResult(null);
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

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-4 text-sm text-amber-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-2">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
          <div>
            <p className="font-bold text-amber-950">Fix duplicate staff from failed imports</p>
            <p className="mt-1 text-xs text-amber-900/90">
              Failed uploads may have created extra logins (e.g. <code className="text-ui-xs">surname.51</code>,{' '}
              <code className="text-ui-xs">surname.52</code>) or accounts without HR profiles. This tool keeps one
              account per employee number and removes the rest.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void scan()}
            disabled={Boolean(busy)}
            className={HR_BTN_SECONDARY}
          >
            {busy === 'scan' ? 'Scanning…' : 'Scan duplicates'}
          </button>
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
              {busy === 'cleanup' ? 'Removing…' : confirm ? 'Confirm remove duplicates' : `Remove ${summary.proposedRemovals} duplicate(s)`}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-3 text-xs font-semibold text-red-800">{error}</p> : null}

      {summary ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-white/80 px-2 py-1.5">
            <dt className="text-amber-800/80">Orphan logins</dt>
            <dd className="font-black tabular-nums">{summary.orphanLogins ?? 0}</dd>
          </div>
          <div className="rounded-lg bg-white/80 px-2 py-1.5">
            <dt className="text-amber-800/80">Duplicate emp. #</dt>
            <dd className="font-black tabular-nums">{summary.duplicateEmployeeNos ?? 0}</dd>
          </div>
          <div className="rounded-lg bg-white/80 px-2 py-1.5">
            <dt className="text-amber-800/80">Same name dupes</dt>
            <dd className="font-black tabular-nums">{summary.duplicateDisplayNames ?? 0}</dd>
          </div>
          <div className="rounded-lg bg-white/80 px-2 py-1.5">
            <dt className="text-amber-800/80">To remove</dt>
            <dd className="font-black tabular-nums">{summary.proposedRemovals ?? summary.willRemove ?? 0}</dd>
          </div>
        </dl>
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
          Click <strong>Confirm remove duplicates</strong> again to permanently delete the accounts listed above. Then
          re-import your Excel with <strong>Update &amp; add</strong> to refresh the remaining profiles.
        </p>
      ) : null}
    </div>
  );
}
