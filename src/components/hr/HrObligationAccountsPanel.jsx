import { HrButton, HrAddButton, HR_BTN_SECONDARY } from '../../components/hr/hrPageUi';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatNgn } from '../../lib/hrFormat';
import {
  fetchObligationAccountDetail,
  fetchObligationAccounts,
  obligationDisbursementVoucherPdfUrl,
  obligationRepaymentReceiptPdfUrl,
  obligationStatementPdfUrl,
  recordObligationRepayment,
} from '../../lib/hrStaffObligations';
import { HrObligationMaintenancePanel } from './HrObligationMaintenancePanel';
import { HR_FIELD_CLASS } from './hrFormStyles';

const KIND_LABEL = { loan: 'Loan', purchase: 'Purchase credit', recovery: 'Discipline recovery' };
const KIND_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'loan', label: 'Loans' },
  { id: 'purchase', label: 'Purchase credit' },
  { id: 'recovery', label: 'Recovery' },
];

/**
 * HR / finance view of staff obligation accounts with cash repayment and PDF downloads.
 */
export function HrObligationAccountsPanel() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ledgerReady, setLedgerReady] = useState(true);
  const [listError, setListError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [repayRef, setRepayRef] = useState('');
  const [repayNote, setRepayNote] = useState('');
  const [recalculateInstallment, setRecalculateInstallment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [kindFilter, setKindFilter] = useState('all');

  const filteredAccounts = useMemo(() => {
    if (kindFilter === 'all') return accounts;
    return accounts.filter((a) => a.kind === kindFilter);
  }, [accounts, kindFilter]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setListError('');
    const [loansRes, purchasesRes, recoveriesRes] = await Promise.all([
      fetchObligationAccounts({ kind: 'loan' }),
      fetchObligationAccounts({ kind: 'purchase' }),
      fetchObligationAccounts({ kind: 'recovery' }),
    ]);
    setLoading(false);
    const ready = loansRes.data?.ledgerReady !== false;
    setLedgerReady(ready);
    if (!loansRes.ok || !loansRes.data?.ok) {
      setListError(loansRes.data?.error || 'Could not load obligation accounts.');
      setAccounts([]);
      return;
    }
    const loans = loansRes.data.accounts || [];
    const purchases = purchasesRes.ok && purchasesRes.data?.ok ? purchasesRes.data.accounts || [] : [];
    const recoveries = recoveriesRes.ok && recoveriesRes.data?.ok ? recoveriesRes.data.accounts || [] : [];
    const merged = [...loans, ...purchases, ...recoveries].sort(
      (a, b) => String(b.updatedAtIso || '').localeCompare(String(a.updatedAtIso || ''))
    );
    setAccounts(merged);
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setDetail(null);
      setDetailError('');
      return;
    }
    setDetailError('');
    const r = await fetchObligationAccountDetail(id);
    if (r.ok && r.data?.ok) setDetail(r.data.account);
    else {
      setDetail(null);
      setDetailError(r.data?.error || 'Could not load account detail.');
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const submitRepayment = async (e, payInFull = false) => {
    e.preventDefault();
    if (!selectedId || !detail) return;
    setBusy(true);
    setError('');
    setMessage('');
    const amount = payInFull
      ? detail.principalOutstandingNgn
      : Math.round(Number(repayAmount) || 0);
    const r = await recordObligationRepayment(selectedId, {
      amountNgn: amount,
      payInFull: payInFull || undefined,
      paymentReference: repayRef.trim() || undefined,
      note: repayNote.trim() || undefined,
      recalculateInstallment: !payInFull && recalculateInstallment ? true : undefined,
    });
    setBusy(false);
    const data = r.data || r;
    if (!r.ok || !data?.ok) {
      setError(data?.error || 'Repayment failed');
      return;
    }
    setMessage(`Recorded — receipt ${data.receiptReference || ''}`);
    setRepayAmount('');
    setRepayRef('');
    setRepayNote('');
    await loadAccounts();
    await loadDetail(selectedId);
  };

  if (loading) return <p className="text-sm text-slate-500">Loading obligation accounts…</p>;
  if (!ledgerReady) {
    return (
      <p className="text-sm text-amber-800 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
        Staff obligation ledger is not migrated on this server yet. Run database migrations first.
      </p>
    );
  }
  if (listError) {
    return <p className="text-sm text-red-600">{listError}</p>;
  }
  if (!accounts.length) return <p className="text-sm text-slate-500">No active staff obligation accounts.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setKindFilter(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              kindFilter === f.id
                ? 'bg-zarewa-teal text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2 max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
        {filteredAccounts.length ? (
          filteredAccounts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelectedId(a.id)}
            className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition ${
              selectedId === a.id ? 'border-zarewa-teal bg-teal-50' : 'border-slate-100 hover:bg-slate-50'
            }`}
          >
            <p className="font-bold text-slate-900">{a.title || a.id}</p>
            <p className="text-xs text-slate-600 mt-1">
              {KIND_LABEL[a.kind] || a.kind} · {a.staffDisplayName || a.userId}
              {a.branchId ? <span className="text-slate-400"> · Branch {a.branchId}</span> : null}
            </p>
            <p className="text-xs font-semibold text-zarewa-teal tabular-nums">
              {formatNgn(a.principalOutstandingNgn)} outstanding
              {a.status === 'active' && a.deductionsActive === false && a.principalOutstandingNgn > 0 ? (
                <span className="ml-2 text-amber-700 font-bold">· Paused</span>
              ) : null}
            </p>
          </button>
          ))
        ) : (
          <p className="text-sm text-slate-500 px-1">No accounts in this category.</p>
        )}
      </div>

      {detail ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div>
            <h4 className="font-black text-zarewa-teal">{detail.title}</h4>
            <p className="text-xs text-slate-600 mt-1">
              {detail.staffDisplayName} · {KIND_LABEL[detail.kind] || detail.kind} · {detail.status}
              {detail.branchId ? <span className="text-slate-400"> · Branch {detail.branchId}</span> : null}
            </p>
            <p className="text-lg font-black tabular-nums text-slate-900 mt-2">
              {formatNgn(detail.principalOutstandingNgn)} / {formatNgn(detail.principalOriginalNgn)}
            </p>
            {detail.quotationRef ? (
              <p className="text-xs text-slate-500 mt-1">Quotation {detail.quotationRef}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
              <a className="text-zarewa-teal underline" href={obligationStatementPdfUrl(detail.id)} target="_blank" rel="noreferrer">
                Statement PDF
              </a>
              {detail.kind === 'loan' && detail.status === 'approved_pending_disbursement' ? (
                <a
                  className="text-zarewa-teal underline"
                  href={obligationDisbursementVoucherPdfUrl(detail.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Disbursement voucher
                </a>
              ) : null}
            </div>
          </div>

          {detail.transactions?.length ? (
            <div>
              <p className="text-ui-xs font-bold uppercase text-slate-500 mb-2">Transactions</p>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto text-xs">
                {detail.transactions.map((tx) => (
                  <li
                    key={tx.id}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-slate-50 pb-1"
                  >
                    <span className="truncate">
                      {tx.type} · {String(tx.effectiveAtIso || '').slice(0, 10)}
                    </span>
                    <span className="font-semibold tabular-nums text-right">{formatNgn(tx.amountNgn)}</span>
                    {tx.type === 'cash_repayment' || tx.type === 'payroll_deduction' ? (
                      <a
                        className="text-zarewa-teal underline shrink-0"
                        href={obligationRepaymentReceiptPdfUrl(detail.id, tx.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Receipt
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <HrObligationMaintenancePanel
            account={detail}
            onUpdated={async () => {
              await loadAccounts();
              await loadDetail(selectedId);
            }}
          />

          {detail.principalOutstandingNgn > 0 && detail.status === 'active' && detail.kind !== 'recovery' ? (
            <form onSubmit={submitRepayment} className="space-y-3 border-t border-slate-100 pt-3">
              <p className="text-ui-xs font-bold uppercase text-slate-500">Record staff repayment</p>
              <p className="text-xs text-slate-600">
                Staff pay cash or bank transfer — post here after payment is received, or use{' '}
                <strong>Finance → Desk</strong> at the branch cashier. They see the updated balance on{' '}
                <strong>My Profile → Loans & credit → Pay back</strong>.
              </p>
              {error ? <p className="text-xs font-bold text-rose-700">{error}</p> : null}
              {message ? <p className="text-xs font-semibold text-emerald-800">{message}</p> : null}
              <label className="block text-xs font-semibold text-slate-600">
                Amount (₦)
                <input
                  type="number"
                  className={`mt-1 ${HR_FIELD_CLASS}`}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  required
                  min={1}
                  max={detail.principalOutstandingNgn}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Bank reference (optional)
                <input className={`mt-1 ${HR_FIELD_CLASS}`} value={repayRef} onChange={(e) => setRepayRef(e.target.value)} />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Note
                <input className={`mt-1 ${HR_FIELD_CLASS}`} value={repayNote} onChange={(e) => setRepayNote(e.target.value)} />
              </label>
              <label className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={recalculateInstallment}
                  onChange={(e) => setRecalculateInstallment(e.target.checked)}
                />
                <span>Recalculate monthly installment from new balance (partial pay only)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <HrButton type="submit" disabled={busy} >
                  {busy ? 'Posting…' : 'Post partial payment'}
                </HrButton>
                <HrButton
                  type="button"
                  disabled={busy}
                  variant="secondary"
                  onClick={(e) => submitRepayment(e, true)}
                >
                  Pay in full ({formatNgn(detail.principalOutstandingNgn)})
                </HrButton>
                <button type="button" onClick={() => loadDetail(selectedId)} className={HR_BTN_SECONDARY}>
                  Refresh
                </button>
              </div>
            </form>
          ) : detail.kind === 'recovery' && detail.principalOutstandingNgn > 0 ? (
            <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-3 text-xs text-violet-950">
              <strong>Discipline recoveries are paid at the branch cashier</strong> (Finance → Desk → Staff recoveries).
              HR sets the amount on the discipline case; the cashier records payment date and which account was credited.
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500 self-center">
          {detailError || 'Select an account to view detail and record repayments.'}
        </p>
      )}
    </div>
    </div>
  );
}
