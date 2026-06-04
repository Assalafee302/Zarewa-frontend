import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';

function defaultPeriodFromEndDate(endDate) {
  const s = String(endDate || '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(s) ? s : new Date().toISOString().slice(0, 7);
}

function severityChipClass(severity) {
  if (severity === 'warn') return 'bg-amber-100 text-amber-900 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

/**
 * Phase A1 — operational cash tie-out (receipt confirmation basis). Not statutory reconciliation.
 */
export function ReportsFinanceReconciliationPackSection({ endDate, hasFinanceView, showToast, branchScopeLabel }) {
  const [period, setPeriod] = useState(() => defaultPeriodFromEndDate(endDate));
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
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
    if (open && hasFinanceView && !data && !loading) {
      void load();
    }
  }, [open, hasFinanceView, data, loading, load]);

  const pack = data?.pack;
  const cashRows = data?.cashFlowSummary?.rows || [];

  const warnNotes = useMemo(
    () => (data?.notes || []).filter((n) => n.severity === 'warn'),
    [data?.notes]
  );

  if (!hasFinanceView) return null;

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
          <h3 className="z-section-title !mb-1">Finance Reconciliation &amp; Cash Confirmation Pack</h3>
          <p className="text-sm font-medium text-slate-600 max-w-3xl leading-relaxed">
            Operational tie-out based on receipt confirmation, customer ledger, treasury movement, and GL activity.
            Formal bank statement reconciliation is separate and not the primary control in this pack.
          </p>
        </div>
        <span className="text-xs font-bold text-teal-800 uppercase tracking-wide shrink-0">
          {open ? 'Collapse' : 'Expand'}
        </span>
      </button>

      <div className="flex flex-wrap gap-2 mt-3">
        {['Management draft', 'Not statutory', 'Receipt confirmation basis', 'Head of Accounts review'].map((label) => (
          <span
            key={label}
            className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900"
          >
            {label}
          </span>
        ))}
      </div>

      {open ? (
        <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-950 leading-relaxed">
            <p className="font-bold mb-1">{data?.label || 'Finance reconciliation and cash confirmation pack'}</p>
            <p>{data?.disclaimer}</p>
            <p className="mt-2 text-xs text-amber-900/90">
              <span className="font-bold">Cashier:</span> confirms receipts and cash movement.{' '}
              <span className="font-bold">Head of Accounts:</span> reviews reconciliation and GL tie-out.{' '}
              <span className="font-bold">MD:</span> reviews exceptions.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-600 uppercase tracking-wide">
              Period (month)
              <input
                type="month"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="z-btn-primary px-4 py-2 text-sm font-bold rounded-lg"
              disabled={loading}
              onClick={() => void load()}
            >
              {loading ? 'Loading…' : 'Load / Refresh'}
            </button>
            {branchScopeLabel ? (
              <span className="text-xs font-semibold text-slate-500 pb-2">Scope: {branchScopeLabel}</span>
            ) : null}
          </div>

          {data?.cashConfirmationBasis ? (
            <p className="text-sm font-medium text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-800">Receipt confirmation basis:</span> {data.cashConfirmationBasis}{' '}
              <span className="text-slate-500">
                ({data.formalBankReconciliationStatus || 'Formal bank reconciliation pending'})
              </span>
            </p>
          ) : null}

          {pack?.ok ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Confirmed sales receipts
                </p>
                <p className="text-xl font-black text-slate-900 tabular-nums">{formatNgn(pack.salesReceiptsPostedNgn)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Ledger receipt-like
                </p>
                <p className="text-xl font-black text-slate-900 tabular-nums">{formatNgn(pack.ledgerReceiptLikeNgn)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Treasury customer inflow
                </p>
                <p className="text-xl font-black text-slate-900 tabular-nums">{formatNgn(pack.treasuryCustomerInNgn)}</p>
              </div>
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-teal-800 mb-1">
                  GL cash 1000 (month activity)
                </p>
                <p className="text-lg font-black text-teal-900 tabular-nums">
                  {formatNgn(pack.glCash1000Month?.netNgn ?? 0)}
                </p>
                <p className="text-xs text-teal-800/80 mt-1 font-medium">Net debits − credits in period</p>
              </div>
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-teal-800 mb-1">
                  GL AR 1200 (month activity)
                </p>
                <p className="text-lg font-black text-teal-900 tabular-nums">
                  {formatNgn(pack.glAr1200Month?.netNgn ?? 0)}
                </p>
                <p className="text-xs text-teal-800/80 mt-1 font-medium">Not full AR subledger balance</p>
              </div>
            </div>
          ) : null}

          {cashRows.length > 0 ? (
            <div>
              <h4 className="text-sm font-black text-slate-800 mb-2">Treasury movement summary (by type)</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                <p className="text-xs font-semibold text-slate-600 mt-2">
                  Net treasury movement (signed as stored): {formatNgn(data.cashFlowSummary.netTreasuryMovementNgn)}
                </p>
              ) : null}
            </div>
          ) : null}

          {warnNotes.length > 0 ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-2">Warnings / differences</p>
              <ul className="space-y-2 text-sm font-medium text-amber-950">
                {warnNotes.map((n) => (
                  <li key={n.code}>{n.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {(data?.notes || []).length > 0 ? (
            <details className="text-sm">
              <summary className="font-bold text-slate-700 cursor-pointer">All notes ({data.notes.length})</summary>
              <ul className="mt-2 space-y-2">
                {data.notes.map((n) => (
                  <li
                    key={n.code}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium ${severityChipClass(n.severity)}`}
                  >
                    <span className="font-bold uppercase tracking-wide">{n.code}</span> — {n.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {pack?.note ? (
            <p className="text-xs font-medium text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
              {pack.note}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
