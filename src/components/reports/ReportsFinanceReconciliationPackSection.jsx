import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Scale } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import {
  AccountingDeskKpiCard,
  AccountingDeskNotice,
  AccountingDeskPageIntro,
  ACCOUNTING_FIELD_LABEL,
  ACCOUNTING_INPUT,
} from '../finance/accounting/AccountingDeskUi';
import { AccountingDeskTableSection } from '../finance/accounting/AccountingDeskTableSection';

function defaultPeriodFromEndDate(endDate) {
  const s = String(endDate || '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(s) ? s : new Date().toISOString().slice(0, 7);
}

/**
 * Phase A1 — operational cash tie-out (receipt confirmation basis). Not statutory reconciliation.
 * @param {{ endDate?: string; hasFinanceView?: boolean; showToast?: Function; branchScopeLabel?: string; deskLayout?: boolean }} props
 */
export function ReportsFinanceReconciliationPackSection({
  endDate,
  hasFinanceView,
  showToast,
  branchScopeLabel,
  deskLayout = false,
}) {
  const [period, setPeriod] = useState(() => defaultPeriodFromEndDate(endDate));
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(deskLayout);
  const [data, setData] = useState(null);

  useEffect(() => {
    setPeriod((prev) => {
      const next = defaultPeriodFromEndDate(endDate);
      return prev === next ? prev : next;
    });
  }, [endDate]);

  const load = useCallback(async () => {
    if (!hasFinanceView) return;
    if (!/^\d{4}-\d{2}$/.test(period)) {
      showToast('Choose a valid month (YYYY-MM).', { variant: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/finance/reconciliation-pack?period=${encodeURIComponent(period)}`);
      if (!res.ok || !res.data?.ok) {
        showToast(res.data?.error || 'Could not load reconciliation pack.', { variant: 'error' });
        setData(null);
        return;
      }
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [hasFinanceView, period, showToast]);

  useEffect(() => {
    if ((open || deskLayout) && hasFinanceView && !data && !loading) {
      void load();
    }
  }, [open, deskLayout, hasFinanceView, data, loading, load]);

  const pack = data?.pack;
  const cashRows = data?.cashFlowSummary?.rows || [];

  const warnNotes = useMemo(
    () => (data?.notes || []).filter((n) => n.severity === 'warn'),
    [data?.notes]
  );

  if (!hasFinanceView) return null;

  const content = (
    <div className="space-y-4">
      <AccountingDeskNotice tone="warn">
        {data?.disclaimer ||
          'Operational tie-out based on receipt confirmation. Formal bank statement reconciliation is separate.'}
        {' '}
        Cashier confirms receipts; Head of Accounts reviews tie-out; MD reviews exceptions.
      </AccountingDeskNotice>

      <ProcurementFormSection letter="P" title="Period" compact>
        <div className="flex flex-wrap items-end gap-3">
          <label className={ACCOUNTING_FIELD_LABEL}>
            Month
            <input
              type="month"
              className={`${ACCOUNTING_INPUT} mt-1`}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            className="inline-flex items-center gap-1 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm hover:brightness-105 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading…' : 'Load / refresh'}
          </button>
          {branchScopeLabel ? (
            <span className="text-[10px] font-semibold text-slate-500 pb-1">Scope: {branchScopeLabel}</span>
          ) : null}
        </div>
      </ProcurementFormSection>

      {data?.cashConfirmationBasis ? (
        <p className="text-[11px] font-medium text-slate-700 leading-relaxed">
          <span className="font-bold text-slate-800">Receipt confirmation basis:</span> {data.cashConfirmationBasis}{' '}
          <span className="text-slate-500">
            ({data.formalBankReconciliationStatus || 'Formal bank reconciliation pending'})
          </span>
        </p>
      ) : null}

      {pack?.ok ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <AccountingDeskKpiCard label="Confirmed sales receipts" value={formatNgn(pack.salesReceiptsPostedNgn)} />
          <AccountingDeskKpiCard label="Ledger receipt-like" value={formatNgn(pack.ledgerReceiptLikeNgn)} />
          <AccountingDeskKpiCard label="Treasury customer inflow" value={formatNgn(pack.treasuryCustomerInNgn)} />
          <AccountingDeskKpiCard
            label="GL cash 1000 (month)"
            value={formatNgn(pack.glCash1000Month?.netNgn ?? 0)}
            hint="Net debits − credits"
            tone="teal"
          />
          <AccountingDeskKpiCard
            label="GL AR 1200 (month)"
            value={formatNgn(pack.glAr1200Month?.netNgn ?? 0)}
            hint="Not full AR subledger"
            tone="teal"
          />
        </div>
      ) : null}

      {cashRows.length > 0 ? (
        <AccountingDeskTableSection title="Treasury movement summary" description="By movement type for the period">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Amount (₦)</th>
                </tr>
              </thead>
              <tbody>
                {cashRows.map((row) => (
                  <tr key={row.type} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">{row.type}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{formatNgn(row.totalNgn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.cashFlowSummary?.netTreasuryMovementNgn != null ? (
            <p className="text-[10px] font-semibold text-slate-600 mt-2">
              Net treasury movement (signed as stored): {formatNgn(data.cashFlowSummary.netTreasuryMovementNgn)}
            </p>
          ) : null}
        </AccountingDeskTableSection>
      ) : null}

      {warnNotes.length > 0 ? (
        <AccountingDeskNotice tone="warn">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2">Warnings / differences</p>
          <ul className="space-y-1 text-[11px]">
            {warnNotes.map((n) => (
              <li key={n.code}>{n.message}</li>
            ))}
          </ul>
        </AccountingDeskNotice>
      ) : null}

      {(data?.notes || []).length > 0 ? (
        <ProcurementFormSection letter="N" title={`All notes (${data.notes.length})`} compact>
          <ul className="space-y-2">
            {data.notes.map((n) => (
              <li
                key={n.code}
                className={`rounded-lg border px-3 py-2 text-[10px] font-medium ${
                  n.severity === 'warn'
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <span className="font-bold uppercase tracking-wide">{n.code}</span> — {n.message}
              </li>
            ))}
          </ul>
        </ProcurementFormSection>
      ) : null}

      {pack?.note ? (
        <p className="text-[10px] font-medium text-slate-500 leading-relaxed border-t border-slate-100 pt-3">{pack.note}</p>
      ) : null}
    </div>
  );

  if (deskLayout) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:gap-6 min-w-0">
        <AccountingDeskPageIntro
          title="Finance reconciliation & cash confirmation"
          description="Operational tie-out based on receipt confirmation, customer ledger, treasury movement, and GL activity."
          action={
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm hover:brightness-105 disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          }
        />
        <div className="flex flex-wrap gap-2">
          {['Management draft', 'Not statutory', 'Receipt confirmation basis', 'Head of Accounts review'].map((label) => (
            <span
              key={label}
              className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900"
            >
              {label}
            </span>
          ))}
        </div>
        {content}
      </div>
    );
  }

  return (
    <div
      id="reports-finance-reconciliation-pack"
      className="z-panel-section border border-amber-100/90 bg-white/90 p-5 sm:p-6 rounded-2xl shadow-sm"
    >
      <button
        type="button"
        className="w-full text-left flex flex-wrap items-start justify-between gap-3"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <h3 className="z-section-title !mb-1 flex items-center gap-2">
            <Scale size={16} className="text-[#134e4a]" />
            Finance Reconciliation &amp; Cash Confirmation Pack
          </h3>
          <p className="text-sm font-medium text-slate-600 max-w-3xl leading-relaxed">
            Operational tie-out based on receipt confirmation, customer ledger, treasury movement, and GL activity.
          </p>
        </div>
        <span className="text-xs font-bold text-teal-800 uppercase tracking-wide shrink-0">
          {open ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {open ? <div className="mt-5 border-t border-slate-100 pt-5">{content}</div> : null}
    </div>
  );
}
