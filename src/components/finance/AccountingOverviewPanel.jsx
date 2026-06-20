import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Scale, Wallet, FileBarChart } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import {
  AccountingDeskKpiCard,
  AccountingDeskPageIntro,
  ACCOUNTING_CARD_ROW,
} from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';
import { ACCOUNTING_OPENING_DATE_LABEL } from '../../shared/accountingCutover';

/**
 * @param {{ branchScopeLabel?: string; showToast?: (msg: string, opts?: object) => void; deskLayout?: boolean }} props
 */
export function AccountingOverviewPanel({ branchScopeLabel = '', deskLayout = false }) {
  const [data, setData] = useState(null);
  const [opening, setOpening] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [exRes, obRes] = await Promise.all([
        apiFetch('/api/finance/trial-exceptions'),
        apiFetch('/api/finance/opening-balance/status'),
      ]);
      if (!exRes.ok || !exRes.data?.ok) {
        setError(exRes.data?.error || 'Could not load exception summary.');
        setData(null);
      } else {
        setData(exRes.data);
      }
      if (obRes.ok && obRes.data?.ok) setOpening(obRes.data);
      else setOpening(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
          label="Opening balance"
          value={opening?.posted ? 'Posted' : 'Pending'}
          hint={`${ACCOUNTING_OPENING_DATE_LABEL} cutover journal`}
          tone={opening?.posted ? 'teal' : 'amber'}
        />
        <AccountingDeskKpiCard
          icon={<Scale size={12} />}
          label="GL auto-post"
          value="Live"
          hint="Supplier pay, expenses on payment, production, receipts"
          tone="teal"
        />
        <AccountingDeskKpiCard
          icon={<FileBarChart size={12} />}
          label="Statements"
          value="Draft"
          hint="Use Statements tab for P&L and balance sheet"
        />
      </div>

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
