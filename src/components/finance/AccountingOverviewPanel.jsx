import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Scale, Wallet, FileBarChart, Flag, CheckCircle2, Lock, BookOpen } from 'lucide-react';
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
}) {
  const {
    periodKey,
    overview,
    overviewLoading,
    overviewError,
    reloadOverview,
  } = useAccountingDesk();

  const ex = overview?.exceptions?.exceptions || overview?.exceptions || {};
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

  const exceptionTotal = Number(overview?.exceptionTotal) || blockers.reduce((sum, b) => sum + Number(b.count), 0);

  const quickLinks = [
    { id: 'opening', label: 'Opening Pack', hint: 'June cutover', icon: Flag },
    { id: 'close', label: 'Month-end close', hint: 'Checklist & lock', icon: Lock },
    { id: 'statements', label: 'Statements', hint: 'P&L & balance sheet', icon: FileBarChart },
    { id: 'creditors', label: 'Registers', hint: 'Receivables & payables', icon: BookOpen },
  ];

  const pack = overview?.pack;
  const statements = overview?.statements;
  const closePack = overview?.close;
  const cutoverSources = (pack?.sources || []).filter((s) => s.status === 'warn' || s.status === 'fail');
  const openingPosted = Boolean(overview?.opening?.posted || pack?.alreadyPosted);
  const glFlags = overview?.flags || {};
  const ap1cLive =
    glFlags.accountingPolicyV1ReceiptGl || glFlags.accountingPolicyV1ProductionRelease;
  const glAutoPostLabel = ap1cLive ? 'AP1c on' : 'Core hooks';
  const glAutoPostHint = ap1cLive
    ? 'Deposit policy GL posting enabled'
    : 'Supplier pay, expenses, production, receipts — AP1c flags off';

  const refreshAction = (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal hover:bg-slate-50"
      onClick={reloadOverview}
      disabled={overviewLoading}
    >
      <RefreshCw size={14} className={overviewLoading ? 'animate-spin' : ''} />
      Refresh
    </button>
  );

  if (overviewLoading && !overview) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

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
        <p className="text-xs font-medium text-slate-600">
          Scope: <span className="font-bold text-slate-800">{branchScopeLabel}</span>
          {!openingPosted ? (
            <span className="ml-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-ui-xs font-bold uppercase text-amber-900">
              Pre-cutover
            </span>
          ) : (
            <span className="ml-2 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-ui-xs font-bold uppercase text-teal-900">
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
                  <Icon size={16} className="text-zarewa-teal shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zarewa-teal">{q.label}</p>
                    <p className="text-ui-xs text-slate-500">{q.hint}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {overviewError ? <p className="text-xs font-medium text-rose-700">{overviewError}</p> : null}

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
        <AccountingCutoverActionPlan onFocusTab={onFocusTab} plan={overview?.cutoverPlan} />
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
            <h3 className="text-ui-xs font-black uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
              <Flag size={12} />
              Cutover readiness — {pack.inventoryPeriodKey || '2026-05'} register basis
            </h3>
            {onFocusTab ? (
              <button
                type="button"
                className="text-ui-xs font-bold text-teal-800 hover:underline"
                onClick={() => onFocusTab('opening')}
              >
                Open Opening tab →
              </button>
            ) : null}
          </div>
          {pack.summary ? (
            <p className="px-4 py-2 text-xs text-slate-600 border-b border-slate-50">{pack.summary}</p>
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
                    <span className="text-xs font-semibold text-slate-800">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black tabular-nums text-slate-900">{formatNgn(s.amountNgn)}</span>
                    {s.drillDownTab && onFocusTab ? (
                      <button
                        type="button"
                        className="text-ui-xs font-bold text-teal-800 hover:underline"
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
            <p className="px-4 py-3 text-xs font-medium text-teal-800">
              All register sources loaded — enter owner&apos;s capital on Opening tab and post when HoA confirms.
            </p>
          ) : null}
        </section>
      ) : null}

      {blockers.length > 0 ? (
        <section id="accounting-action-required" className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
          <h3 className="text-xs font-black uppercase tracking-wide text-amber-900">Action required</h3>
          <ul className="mt-3 space-y-2">
            {blockers.map((b) => (
              <li key={b.key} className={ACCOUNTING_CARD_ROW}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">{b.label}</span>
                  <span className="text-sm font-black tabular-nums text-amber-900">{Number(b.count)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    to={b.to}
                    className="inline-flex rounded-lg bg-zarewa-teal px-3 py-1 text-ui-xs font-bold uppercase tracking-wide text-white hover:brightness-105"
                  >
                    {b.action}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-xs font-medium text-teal-800">No trial exceptions in scope — continue with registers and statements.</p>
      )}
    </div>
  );
}
