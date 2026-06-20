import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Scale, Wallet, FileBarChart, Flag, CheckCircle2, Lock, BookOpen } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import {
  AccountingDeskKpiCard,
  AccountingDeskPageIntro,
  AccountingDeskNotice,
  ACCOUNTING_CARD_ROW,
} from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';
import { AccountingExecutiveSummary } from './accounting/AccountingExecutiveSummary';
import { AccountingDeskMobileStrip } from './accounting/AccountingDeskMobileStrip';
import { AccountingCutoverActionPlan } from './accounting/AccountingCutoverActionPlan';
import { AccountingManagementDisclaimer } from './accounting/AccountingManagementDisclaimer';
import { useAccountingDesk } from './accounting/AccountingDeskContext';
import { ACCOUNTING_OPENING_DATE_LABEL } from '../../shared/accountingCutover';
import { useWorkspace } from '../../context/WorkspaceContext';

function packQueryString(ws) {
  const params = new URLSearchParams();
  if (ws?.viewAllBranches) {
    params.set('branchId', 'ALL');
  } else {
    const bid = ws?.branchScope || ws?.session?.currentBranchId;
    if (bid) params.set('branchId', bid);
  }
  const q = params.toString();
  return q ? `?${q}` : '';
}

/**
 * @param {{
 *   branchScopeLabel?: string;
 *   showToast?: (msg: string, opts?: object) => void;
 *   deskLayout?: boolean;
 *   onFocusTab?: (tabId: string) => void;
 *   deskRefresh?: number;
 * }} props
 */
export function AccountingOverviewPanel({
  branchScopeLabel = '',
  deskLayout = false,
  onFocusTab,
  deskRefresh = 0,
}) {
  const ws = useWorkspace();
  const { periodKey } = useAccountingDesk();
  const [data, setData] = useState(null);
  const [opening, setOpening] = useState(null);
  const [pack, setPack] = useState(null);
  const [statements, setStatements] = useState(null);
  const [closePack, setClosePack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const branchParams = new URLSearchParams();
      if (ws?.viewAllBranches) branchParams.set('branchId', 'ALL');
      else {
        const bid = ws?.branchScope || ws?.session?.currentBranchId;
        if (bid) branchParams.set('branchId', bid);
      }
      const branchSuffix = branchParams.toString() ? `&${branchParams.toString()}` : '';
      const periodSuffix = periodKey ? `period=${encodeURIComponent(periodKey)}${branchSuffix}` : '';

      const [exRes, obRes, packRes, stmtRes, closeRes] = await Promise.all([
        apiFetch('/api/finance/trial-exceptions'),
        apiFetch('/api/finance/opening-balance/status'),
        apiFetch(`/api/finance/opening-pack${packQueryString(ws)}`),
        periodKey ? apiFetch(`/api/finance/statements-pack?${periodSuffix}`) : Promise.resolve(null),
        periodKey ? apiFetch(`/api/finance/month-end-close?${periodSuffix}`) : Promise.resolve(null),
      ]);
      if (!exRes.ok || !exRes.data?.ok) {
        setError(exRes.data?.error || 'Could not load exception summary.');
        setData(null);
      } else {
        setData(exRes.data);
      }
      if (obRes.ok && obRes.data?.ok) setOpening(obRes.data);
      else setOpening(null);
      if (packRes.ok && packRes.data?.ok) setPack(packRes.data);
      else setPack(null);
      if (stmtRes?.ok && stmtRes.data?.ok) setStatements(stmtRes.data);
      else setStatements(null);
      if (closeRes?.ok && closeRes.data?.ok) setClosePack(closeRes.data);
      else setClosePack(null);
    } finally {
      setLoading(false);
    }
  }, [ws, periodKey]);

  useEffect(() => {
    load();
  }, [load, deskRefresh]);

  const ex = data?.exceptions || data || {};
  const blockers = [
    {
      key: 'pendingReceiptClearance',
      label: 'Receipts pending confirmation',
      action: 'Confirm receipts',
      to: '/cashier',
      count: ex.pendingReceiptClearance,
    },
    {
      key: 'receiptBankAmountMismatch',
      label: 'Receipt bank mismatch',
      action: 'Review cashier',
      to: '/cashier',
      count: ex.receiptBankAmountMismatch,
    },
    {
      key: 'treasuryMovementWithoutFinanceSettlement',
      label: 'Treasury not settled',
      action: 'Settle movements',
      to: '/accounts?tab=desk',
      count: ex.treasuryMovementWithoutFinanceSettlement,
    },
    {
      key: 'openDeliveriesWouldBlockOnPayment',
      label: 'Unpaid deliveries (gate)',
      action: 'Review deliveries',
      to: '/accounting',
      count: ex.openDeliveriesWouldBlockOnPayment,
    },
  ].filter((b) => Number(b.count) > 0);

  const exceptionTotal = blockers.reduce((sum, b) => sum + Number(b.count), 0);

  const quickLinks = [
    { id: 'opening', label: 'Opening Pack', hint: 'June cutover', icon: Flag },
    { id: 'close', label: 'Month-end close', hint: 'Checklist & lock', icon: Lock },
    { id: 'statements', label: 'Statements', hint: 'P&L & balance sheet', icon: FileBarChart },
    { id: 'creditors', label: 'Registers', hint: 'Receivables & payables', icon: BookOpen },
  ];

  const cutoverSources = (pack?.sources || []).filter((s) => s.status === 'warn' || s.status === 'fail');
  const openingPosted = Boolean(opening?.posted || pack?.alreadyPosted);
  const glFlags = data?.flags || {};
  const ap1cLive =
    glFlags.accountingPolicyV1ReceiptGl || glFlags.accountingPolicyV1ProductionRelease;
  const glAutoPostLabel = ap1cLive ? 'AP1c on' : 'Core hooks';
  const glAutoPostHint = ap1cLive
    ? 'Deposit policy GL posting enabled'
    : 'Supplier pay, expenses, production, receipts — AP1c flags off';

  const refreshAction = (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
      onClick={load}
      disabled={loading}
    >
      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      Refresh
    </button>
  );

  return (
    <div className="space-y-5">
      {deskLayout ? (
        <AccountingRegisterHeader compact actions={refreshAction} />
      ) : (
        <AccountingDeskPageIntro
          title="Accounting overview"
          description="Exception counts and cutover readiness. Resolve blockers before month-end statements."
          action={refreshAction}
        />
      )}

      {branchScopeLabel ? (
        <p className="text-[11px] font-medium text-slate-600">
          Scope: <span className="font-bold text-slate-800">{branchScopeLabel}</span>
          {!openingPosted ? (
            <span className="ml-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-900">
              Pre-cutover
            </span>
          ) : (
            <span className="ml-2 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[9px] font-bold uppercase text-teal-900">
              Live GL
            </span>
          )}
        </p>
      ) : null}

      {onFocusTab ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onFocusTab(q.id)}
                className={`${ACCOUNTING_CARD_ROW} text-left w-full hover:border-teal-200/80`}
              >
                <div className="flex items-start gap-2">
                  <Icon size={16} className="text-[#134e4a] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold text-[#134e4a]">{q.label}</p>
                    <p className="text-[10px] text-slate-500">{q.hint}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? <p className="text-[11px] font-medium text-rose-700">{error}</p> : null}

      <AccountingManagementDisclaimer />

      <AccountingDeskMobileStrip
        count={exceptionTotal}
        label={
          exceptionTotal
            ? `${exceptionTotal} exception${exceptionTotal === 1 ? '' : 's'} need follow-up`
            : undefined
        }
        onAction={
          exceptionTotal
            ? () => document.getElementById('accounting-action-required')?.scrollIntoView({ behavior: 'smooth' })
            : undefined
        }
        actionLabel="Review"
      />

      {!openingPosted ? (
        <AccountingCutoverActionPlan onFocusTab={onFocusTab} deskRefresh={deskRefresh} />
      ) : null}

      <AccountingExecutiveSummary
        periodKey={periodKey}
        branchScopeLabel={branchScopeLabel}
        openingPosted={openingPosted}
        statements={statements}
        close={closePack}
        exceptionCount={exceptionTotal}
        onFocusTab={onFocusTab}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AccountingDeskKpiCard
          icon={<AlertTriangle size={12} />}
          label="Open exceptions"
          value={blockers.length}
          hint="Items needing Head of Accounts or Cashier follow-up"
          tone={blockers.length ? 'amber' : 'teal'}
        />
        <AccountingDeskKpiCard
          icon={<Wallet size={12} />}
          label="Opening pack"
          value={openingPosted ? 'Posted' : pack ? `${pack.readinessScore ?? 0}% ready` : 'Pending'}
          hint={`${ACCOUNTING_OPENING_DATE_LABEL} register-first cutover`}
          tone={openingPosted ? 'teal' : pack?.blockers?.length ? 'amber' : 'amber'}
        />
        <AccountingDeskKpiCard
          icon={<Scale size={12} />}
          label="GL auto-post"
          value={glAutoPostLabel}
          hint={glAutoPostHint}
          tone={ap1cLive ? 'teal' : 'amber'}
        />
        <AccountingDeskKpiCard
          icon={<FileBarChart size={12} />}
          label="Statements"
          value={statements?.profitAndLoss ? formatNgn(statements.profitAndLoss.netIncomeNgn) : 'Draft'}
          hint={
            statements?.balanceSheet?.balanced
              ? 'P&L and balance sheet balanced'
              : 'Use Reports → Statements for detail'
          }
          tone={statements?.balanceSheet?.balanced ? 'teal' : 'default'}
        />
      </div>

      {!openingPosted && pack ? (
        <section className="rounded-xl border border-slate-200/90 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <h3 className="text-[10px] font-black uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
              <Flag size={12} />
              Cutover readiness — {pack.inventoryPeriodKey || '2026-05'} register basis
            </h3>
            {onFocusTab ? (
              <button
                type="button"
                className="text-[10px] font-bold text-teal-800 hover:underline"
                onClick={() => onFocusTab('opening')}
              >
                Open Opening tab →
              </button>
            ) : null}
          </div>
          {pack.summary ? (
            <p className="px-4 py-2 text-[11px] text-slate-600 border-b border-slate-50">{pack.summary}</p>
          ) : null}
          {pack.blockers?.length ? (
            <div className="px-4 py-2">
              <AccountingDeskNotice tone="warn">{pack.blockers.join(' ')}</AccountingDeskNotice>
            </div>
          ) : null}
          <ul className="divide-y divide-slate-100">
            {(pack.sources || []).map((s) => (
              <li key={s.id} className={ACCOUNTING_CARD_ROW}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {s.status === 'ok' || s.status === 'empty' ? (
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    )}
                    <span className="text-[11px] font-semibold text-slate-800">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black tabular-nums text-slate-900">{formatNgn(s.amountNgn)}</span>
                    {s.drillDownTab && onFocusTab ? (
                      <button
                        type="button"
                        className="text-[10px] font-bold text-teal-800 hover:underline"
                        onClick={() => onFocusTab(s.drillDownTab)}
                      >
                        Open →
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {cutoverSources.length === 0 && !pack.blockers?.length ? (
            <p className="px-4 py-3 text-[11px] font-medium text-teal-800">
              All register sources loaded — enter owner&apos;s capital on Opening tab and post when HoA confirms.
            </p>
          ) : null}
        </section>
      ) : null}

      {blockers.length > 0 ? (
        <section id="accounting-action-required" className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
          <h3 className="text-[11px] font-black uppercase tracking-wide text-amber-900">Action required</h3>
          <ul className="mt-3 space-y-2">
            {blockers.map((b) => (
              <li key={b.key} className={ACCOUNTING_CARD_ROW}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-800">{b.label}</span>
                  <span className="text-sm font-black tabular-nums text-amber-900">{Number(b.count)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    to={b.to}
                    className="inline-flex rounded-lg bg-[#134e4a] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:brightness-105"
                  >
                    {b.action}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-[11px] font-medium text-teal-800">No trial exceptions in scope — continue with registers and statements.</p>
      )}
    </div>
  );
}
