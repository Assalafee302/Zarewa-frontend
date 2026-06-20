import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Lock } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  AccountingDeskKpiCard,
  AccountingDeskPageIntro,
  AccountingDeskNotice,
  ACCOUNTING_CARD_ROW,
} from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

const STATUS_ICON = {
  ok: <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />,
  warn: <AlertTriangle size={16} className="text-amber-600 shrink-0" />,
  fail: <XCircle size={16} className="text-rose-600 shrink-0" />,
};

/**
 * @param {{
 *   branchScopeLabel?: string;
 *   showToast?: (msg: string, opts?: object) => void;
 *   onFocusTab?: (tabId: string) => void;
 *   deskLayout?: boolean;
 * }} props
 */
export function AccountingClosePanel({ branchScopeLabel = '', showToast, onFocusTab, deskLayout = false }) {
  const ws = useWorkspace();
  const canLockPeriod = Boolean(ws?.hasPermission?.('period.manage'));
  const [period, setPeriod] = useState(currentPeriod);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/finance/month-end-close?period=${encodeURIComponent(period)}`);
      if (!res.ok || !res.data?.ok) {
        setError(res.data?.error || 'Could not load close checklist.');
        setData(null);
        return;
      }
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const lockPeriod = async () => {
    if (!canLockPeriod) return;
    setLocking(true);
    try {
      const res = await apiFetch('/api/controls/period-locks', {
        method: 'POST',
        body: JSON.stringify({ periodKey: period, reason: 'Month-end close completed' }),
      });
      if (!res.ok || !res.data?.ok) {
        showToast?.(res.data?.error || 'Could not lock period.', { variant: 'error' });
        return;
      }
      showToast?.(`Period ${period} locked.`);
      await load();
    } finally {
      setLocking(false);
    }
  };

  const unlockPeriod = async () => {
    if (!canLockPeriod) return;
    setLocking(true);
    try {
      const res = await apiFetch(`/api/controls/period-locks/${encodeURIComponent(period)}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Reopened from Accounting Desk close tab' }),
      });
      if (!res.ok || !res.data?.ok) {
        showToast?.(res.data?.error || 'Could not unlock period.', { variant: 'error' });
        return;
      }
      showToast?.(`Period ${period} unlocked.`);
      await load();
    } finally {
      setLocking(false);
    }
  };

  const steps = data?.steps || [];
  const periodLocked = Boolean(data?.periodLock?.locked);

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600">
        Period
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-800"
        />
      </label>
      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        Refresh
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {deskLayout ? (
        <AccountingRegisterHeader compact actions={headerActions} />
      ) : (
        <AccountingDeskPageIntro
          title="Month-end close"
          description="Resolve warnings and blockers before treating statements as final for the period."
          action={headerActions}
        />
      )}

      {branchScopeLabel ? (
        <p className="text-[11px] font-medium text-slate-600">
          Scope: <span className="font-bold text-slate-800">{branchScopeLabel}</span>
        </p>
      ) : null}

      {error ? <p className="text-[11px] font-medium text-rose-700">{error}</p> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AccountingDeskKpiCard
              icon={<Lock size={12} />}
              label="Close readiness"
              value={data.ready ? 'Ready' : 'Open'}
              tone={data.ready ? 'teal' : 'amber'}
            />
            <AccountingDeskKpiCard
              label="Period lock"
              value={periodLocked ? 'Locked' : data.readyToLock ? 'Ready to lock' : 'Open'}
              tone={periodLocked ? 'teal' : data.readyToLock ? 'amber' : 'amber'}
            />
            <AccountingDeskKpiCard label="Blockers" value={String(data.blockers || 0)} tone={data.blockers ? 'rose' : 'teal'} />
            <AccountingDeskKpiCard label="Warnings" value={String(data.warnings || 0)} tone={data.warnings ? 'amber' : 'teal'} />
          </div>

          <p className="text-[11px] font-medium text-slate-700">{data.summary}</p>

          {data.readyToLock && canLockPeriod ? (
            <AccountingDeskNotice tone="trial">
              All operational checks passed. Lock <strong>{period}</strong> when Head of Accounts confirms statements
              are final — this blocks backdated postings into the closed month.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void lockPeriod()}
                  disabled={locking}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide hover:brightness-105 disabled:opacity-50"
                >
                  <Lock size={14} />
                  Lock period
                </button>
              </div>
            </AccountingDeskNotice>
          ) : null}

          {periodLocked && canLockPeriod ? (
            <div className="flex flex-wrap items-center gap-2">
              <AccountingDeskNotice tone="info">
                Period <strong>{period}</strong> is locked
                {data.periodLock?.reason ? ` — ${data.periodLock.reason}` : ''}.
              </AccountingDeskNotice>
              <button
                type="button"
                onClick={() => void unlockPeriod()}
                disabled={locking}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a] hover:bg-slate-50 disabled:opacity-50"
              >
                Unlock
              </button>
            </div>
          ) : null}

          <div className="space-y-2">
            {steps.map((step) => (
              <div key={step.id} className={`${ACCOUNTING_CARD_ROW} flex items-start gap-3`}>
                {STATUS_ICON[step.status] || STATUS_ICON.warn}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-900">{step.label}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-600">{step.detail}</p>
                </div>
                {step.focusTab && onFocusTab ? (
                  <button
                    type="button"
                    onClick={() => onFocusTab(step.focusTab)}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"
                  >
                    Open
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {!loading && !data && !error ? (
        <p className="text-[11px] text-slate-500">Select a period to load the close checklist.</p>
      ) : null}
    </div>
  );
}
