import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { hrHasPermission } from '../../lib/hrAccess';
import {
  HR_SEPARATION_STATUSES,
  fetchHrStaffLifecycle,
  patchHrLifecycleTask,
  patchHrStaffSeparation,
} from '../../lib/hrStaffLifecycle';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { HrStaffPermanentDeletePanel } from './HrStaffPermanentDeletePanel';

/**
 * @param {{
 *   userId: string;
 *   staff?: { displayName?: string; username?: string; employeeNo?: string };
 *   isSelf?: boolean;
 *   initialLifecycle?: object | null;
 *   onUpdated?: () => void;
 * }} props
 */
export function HrStaffLifecyclePanel({ userId, staff, isSelf = false, initialLifecycle, onUpdated }) {
  const ws = useWorkspace();
  const canManage = hrHasPermission(ws?.permissions, 'hr.staff.manage');
  const [lifecycle, setLifecycle] = useState(initialLifecycle || null);
  const [sepStatus, setSepStatus] = useState('active');
  const [lastDay, setLastDay] = useState('');
  const [sepReason, setSepReason] = useState('');
  const [sepNotes, setSepNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  useHrListLoad(async () => {
    const { ok, data } = await fetchHrStaffLifecycle(userId);
    if (!ok || !data?.ok) {
      setLifecycle(null);
      return { error: data?.error || 'Could not load lifecycle.', hasData: false };
    }
    setLifecycle(data.lifecycle);
    const sep = data.lifecycle?.separation;
    if (sep) {
      setSepStatus(sep.status || 'active');
      setLastDay(sep.lastWorkingDayIso || '');
      setSepReason(sep.reason || '');
      setSepNotes(sep.notes || '');
    }
    return { hasData: true };
  }, [userId]);

  const canToggleTask = (workflow, task) => {
    if (canManage) return true;
    if (isSelf && workflow === 'onboarding' && task.key === 'policy_ack') return true;
    return false;
  };

  const toggleTask = async (workflow, taskKey, done) => {
    setBusy(true);
    setErr('');
    const { ok, data } = await patchHrLifecycleTask(userId, { workflow, taskKey, done });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not update task.');
      return;
    }
    setLifecycle(data.lifecycle);
    onUpdated?.();
  };

  const saveSeparation = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setBusy(true);
    setErr('');
    const { ok, data } = await patchHrStaffSeparation(userId, {
      status: sepStatus,
      lastWorkingDayIso: lastDay || null,
      reason: sepReason,
      notes: sepNotes,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not save separation.');
      return;
    }
    setLifecycle(data.lifecycle);
    setMsg('Separation details saved.');
    onUpdated?.();
  };

  const renderChecklist = (block, workflow) => {
    if (!block?.tasks?.length) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
            {workflow === 'offboarding' ? 'Offboarding' : 'Onboarding'} tasks
          </h4>
          <span
            className={`text-[10px] font-bold uppercase ${
              block.complete ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {block.complete ? 'Complete' : `${block.pendingCount} pending`}
          </span>
        </div>
        <ul className="space-y-2">
          {block.tasks.map((t) => (
            <li
              key={t.key}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(t.done)}
                disabled={busy || !canToggleTask(workflow, t)}
                onChange={(e) => toggleTask(workflow, t.key, e.target.checked)}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{t.label}</p>
                <p className="text-[10px] text-slate-500">
                  Owner: {t.ownerLabel}
                  {t.completedAtIso ? ` · Done ${t.completedAtIso.slice(0, 10)}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (!lifecycle) {
    return <p className="text-sm text-slate-600">Loading lifecycle checklist…</p>;
  }

  const showOffboarding =
    lifecycle.separation?.status === 'separating' || lifecycle.separation?.status === 'separated';

  return (
    <div className="space-y-6">
      {msg ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
      ) : null}

      {renderChecklist(lifecycle.onboarding, 'onboarding')}

      {showOffboarding ? renderChecklist(lifecycle.offboarding, 'offboarding') : null}

      {canManage ? (
        <form onSubmit={saveSeparation} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Separation / exit</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Status
              <select className={HR_FIELD_CLASS} value={sepStatus} onChange={(e) => setSepStatus(e.target.value)}>
                {HR_SEPARATION_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Last working day
              <input
                type="date"
                className={HR_FIELD_CLASS}
                value={lastDay}
                onChange={(e) => setLastDay(e.target.value)}
              />
              {lastDay ? (() => {
                const daysNotice = Math.round((new Date(lastDay).getTime() - nowMs) / (1000 * 60 * 60 * 24));
                return daysNotice < 30 ? (
                  <span className="mt-1 block font-normal text-red-700 text-[11px]">⚠️ This is less than the required 30-day notice period per company policy.</span>
                ) : (
                  <span className="mt-1 block font-normal text-emerald-700 text-[11px]">✓ Meets 30-day notice requirement.</span>
                );
              })() : null}
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Reason
              <input
                className={HR_FIELD_CLASS}
                value={sepReason}
                onChange={(e) => setSepReason(e.target.value)}
                placeholder="Resignation, retirement, end of contract, termination…"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Notes
              <textarea
                className={`${HR_FIELD_CLASS} min-h-[72px]`}
                value={sepNotes}
                onChange={(e) => setSepNotes(e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Setting status to Separated disables self-service for this employee. Offboarding tasks appear when status is
            Separating or Separated. Completing exit clearance also deactivates the login account and sets employment
            status to Exited or Retired.
          </p>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Saving…' : 'Save separation'}
          </button>
        </form>
      ) : lifecycle.separation?.status !== 'active' ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold">Separation: {lifecycle.separation.status}</p>
          {lifecycle.separation.lastWorkingDayIso ? (
            <p className="text-xs mt-1">Last day: {lifecycle.separation.lastWorkingDayIso}</p>
          ) : null}
        </div>
      ) : null}

      {canManage && staff?.username ? (
        <HrStaffPermanentDeletePanel
          staff={{ userId, displayName: staff.displayName, username: staff.username, employeeNo: staff.employeeNo }}
          redirectAfterDelete
        />
      ) : null}
    </div>
  );
}
