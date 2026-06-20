import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Scale, Wallet, FileBarChart, Flag, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import {
  AccountingDeskKpiCard,
  AccountingDeskPageIntro,
  AccountingDeskNotice,
  ACCOUNTING_CARD_ROW,
} from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';
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
 * }} props
 */
export function AccountingOverviewPanel({ branchScopeLabel = '', deskLayout = false, onFocusTab }) {
  const ws = useWorkspace();
  const [data, setData] = useState(null);
  const [opening, setOpening] = useState(null);
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [exRes, obRes, packRes] = await Promise.all([
        apiFetch('/api/finance/trial-exceptions'),
        apiFetch('/api/finance/opening-balance/status'),
        apiFetch(`/api/finance/opening-pack${packQueryString(ws)}`),
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
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    load();
  }, [load]);

  const ex = data?.exceptions || data || {};
  const blockers = [
    { key: 'pendingReceiptClearance', label: 'Receipts pending confirmation', to: '/cashier', count: ex.pendingReceiptClearance },
    { key: 'receiptBankAmountMismatch', label: 'Receipt bank mismatch', to: '/cashier', count: ex.receiptBankAmountMismatch },
    { key: 'treasuryMovementWithoutFinanceSettlement', label: 'Treasury not settled', to: '/accounts?tab=desk', count: ex.treasuryMovementWithoutFinanceSettlement },
    { key: 'openDeliveriesWouldBlockOnPayment', label: 'Unpaid deliveries (gate)', to: '/accounting', count: ex.openDeliveriesWouldBlockOnPayment },
  ].filter((b) => Number(b.count) > 0);

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
        </p>
      ) : null}

      {error ? <p className="text-[11px] font-medium text-rose-700">{error}</p> : null}

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
          value="Draft"
          hint="Use Statements tab for P&L and balance sheet"
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
        <section className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
          <h3 className="text-[11px] font-black uppercase tracking-wide text-amber-900">Resolve before close</h3>
          <ul className="mt-3 space-y-2">
            {blockers.map((b) => (
              <li key={b.key} className={ACCOUNTING_CARD_ROW}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-800">{b.label}</span>
                  <span className="text-sm font-black tabular-nums text-amber-900">{Number(b.count)}</span>
                </div>
                <Link to={b.to} className="mt-1 inline-block text-[10px] font-bold text-teal-800 hover:underline">
                  Open workflow →
                </Link>
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
