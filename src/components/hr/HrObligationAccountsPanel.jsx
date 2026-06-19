import React, { useCallback, useEffect, useState } from 'react';
import { formatNgn } from '../../lib/hrFormat';
import {
  fetchObligationAccountDetail,
  fetchObligationAccounts,
  obligationDisbursementVoucherPdfUrl,
  obligationRepaymentReceiptPdfUrl,
  obligationStatementPdfUrl,
  recordObligationRepayment,
} from '../../lib/hrStaffObligations';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

const KIND_LABEL = { loan: 'Loan', purchase: 'Purchase credit', recovery: 'Discipline recovery' };

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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  const submitRepayment = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setError('');
    setMessage('');
    const r = await recordObligationRepayment(selectedId, {
      amountNgn: Math.round(Number(repayAmount) || 0),
      paymentReference: repayRef.trim() || undefined,
      note: repayNote.trim() || undefined,
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
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2 max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
        {accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelectedId(a.id)}
            className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition ${
              selectedId === a.id ? 'border-[#134e4a] bg-teal-50' : 'border-slate-100 hover:bg-slate-50'
            }`}
          >
            <p className="font-bold text-slate-900">{a.title || a.id}</p>
            <p className="text-xs text-slate-600">
              {KIND_LABEL[a.kind] || a.kind} · {a.staffDisplayName || a.userId}
            </p>
            <p className="text-xs font-semibold text-[#134e4a] tabular-nums">
              {formatNgn(a.principalOutstandingNgn)} outstanding
            </p>
          </button>
        ))}
      </div>

      {detail ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div>
            <h4 className="font-black text-[#134e4a]">{detail.title}</h4>
            <p className="text-xs text-slate-600 mt-1">
              {detail.staffDisplayName} · {KIND_LABEL[detail.kind] || detail.kind} · {detail.status}
            </p>
            <p className="text-lg font-black tabular-nums text-slate-900 mt-2">
              {formatNgn(detail.principalOutstandingNgn)} / {formatNgn(detail.principalOriginalNgn)}
            </p>
            {detail.quotationRef ? (
              <p className="text-xs text-slate-500 mt-1">Quotation {detail.quotationRef}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
              <a className="text-[#134e4a] underline" href={obligationStatementPdfUrl(detail.id)} target="_blank" rel="noreferrer">
                Statement PDF
              </a>
              {detail.kind === 'loan' && detail.status === 'approved_pending_disbursement' ? (
                <a
                  className="text-[#134e4a] underline"
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
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Transactions</p>
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
                        className="text-[#134e4a] underline shrink-0"
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

          {detail.principalOutstandingNgn > 0 && detail.status === 'active' ? (
            <form onSubmit={submitRepayment} className="space-y-3 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold uppercase text-slate-500">Record cash / bank repayment</p>
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
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
                  {busy ? 'Posting…' : 'Post repayment'}
                </button>
                <button type="button" onClick={() => loadDetail(selectedId)} className={HR_BTN_SECONDARY}>
                  Refresh
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500 self-center">
          {detailError || 'Select an account to view detail and record repayments.'}
        </p>
      )}
    </div>
  );
}
