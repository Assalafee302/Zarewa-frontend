import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Lock } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
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
 *   periodKey?: string;
 *   onPeriodKeyChange?: (v: string) => void;
 *   deskRefresh?: number;
 * }} props
 */
export function AccountingClosePanel({
  branchScopeLabel = '',
  showToast,
  onFocusTab,
  deskLayout = false,
  periodKey: periodKeyProp,
  onPeriodKeyChange,
  deskRefresh = 0,
}) {
  const ws = useWorkspace();
  const canLockPeriod = Boolean(ws?.hasPermission?.('period.manage'));
  const [periodLocal, setPeriodLocal] = useState(currentPeriod);
  const period = periodKeyProp ?? periodLocal;
  const setPeriod = onPeriodKeyChange ?? setPeriodLocal;
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
  }, [load, deskRefresh]);

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
  const stepsComplete = steps.filter((s) => s.status === 'ok').length;
  const stepsTotal = steps.length;
  const openIssues = steps.filter((s) => s.status !== 'ok' && s.id !== 'period_lock');
  const tieWarnCount = (data?.controlTieOut?.checks || []).filter((c) => c.status === 'warn').length;
  const canShowLock = canLockPeriod && !periodLocked;
  const lockDisabledReasons = !data?.readyToLock
    ? openIssues.map((s) => s.label)
    : [];

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {!periodKeyProp ? (
        <label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600">
          Period
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-800"
          />
        </label>
      ) : null}
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
            {data.controlTieOut ? (
              <AccountingDeskKpiCard
                label="Tie-out variances"
                value={tieWarnCount ? String(tieWarnCount) : 'None'}
                hint={
                  data.controlTieOut.thresholdPct != null
                    ? `Tolerance ${Math.round(Number(data.controlTieOut.thresholdPct) * 100)}%`
                    : 'Register ↔ GL'
                }
                tone={tieWarnCount ? 'amber' : 'teal'}
              />
            ) : null}
          </div>

          <p className="text-[11px] font-medium text-slate-700">{data.summary}</p>

          {stepsTotal > 0 ? (
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-600">
                <span>Checklist progress</span>
                <span>
                  {stepsComplete}/{stepsTotal}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-[#134e4a] transition-all"
                  style={{ width: `${Math.round((stepsComplete / stepsTotal) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}

          {data.readyToLock && canShowLock ? (
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

          {canShowLock && !data.readyToLock && lockDisabledReasons.length ? (
            <AccountingDeskNotice tone="warn">
              <p className="font-bold">Period lock unavailable — resolve first:</p>
              <ul className="mt-2 list-disc pl-4 space-y-1">
                {lockDisabledReasons.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
              <div className="mt-3">
                <button
                  type="button"
                  disabled
                  title="Resolve checklist items above"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 cursor-not-allowed"
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

          {data.controlTieOut?.checks?.length ? (
            <section className="rounded-xl border border-slate-200/90 overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                <h3 className="text-[10px] font-black uppercase tracking-wide text-slate-700">
                  Register ↔ GL tie-out detail
                </h3>
                <p className="mt-0.5 text-[10px] text-slate-500">{data.controlTieOut.disclaimer}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-bold uppercase text-slate-500">
                      <th className="px-4 py-2">Control</th>
                      <th className="px-4 py-2 text-right">Register</th>
                      <th className="px-4 py-2 text-right">GL</th>
                      <th className="px-4 py-2 text-right">Variance</th>
                      <th className="px-4 py-2 text-right">Var %</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.controlTieOut.checks.map((c) => (
                      <tr key={c.id} className="border-b border-slate-50">
                        <td className="px-4 py-2">
                          <span className="font-semibold text-slate-800">{c.label}</span>
                          <span className="ml-1 font-mono text-[10px] text-slate-400">{c.glAccountCode}</span>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatNgn(c.registerNgn)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatNgn(c.glNgn)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatNgn(c.varianceNgn)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                          {c.variancePct != null ? `${c.variancePct}%` : '—'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-2">
                            {c.status === 'ok' ? (
                              <span className="text-[10px] font-bold uppercase text-emerald-700">OK</span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase text-amber-700">Review</span>
                            )}
                            {c.drillDownTab && onFocusTab ? (
                              <button
                                type="button"
                                onClick={() => onFocusTab(c.drillDownTab)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"
                              >
                                Open
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {!loading && !data && !error ? (
        <p className="text-[11px] text-slate-500">Select a period to load the close checklist.</p>
      ) : null}
    </div>
  );
}
