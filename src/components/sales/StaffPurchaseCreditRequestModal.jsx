import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { formatNgn } from '../../lib/hrFormat';
import { createStaffPurchaseCredit, fetchQuotationStaffPurchaseStatus } from '../../lib/hrStaffPurchaseCredit';

/**
 * Request staff purchase credit against a quotation (staff-as-customer).
 * @param {{ open: boolean; onClose: () => void; quotationRef: string; onSubmitted?: () => void }} props
 */
export function StaffPurchaseCreditRequestModal({ open, onClose, quotationRef, onSubmitted }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [amountNgn, setAmountNgn] = useState('');
  const [termMonths, setTermMonths] = useState('3');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !quotationRef) return;
    setLoading(true);
    setError('');
    fetchQuotationStaffPurchaseStatus(quotationRef).then((r) => {
      setLoading(false);
      const data = r.data || r;
      if (!r.ok || !data?.ok) {
        setStatus(null);
        setError(data?.error || r.error || 'Could not load quotation');
        return;
      }
      setStatus(data);
      setAmountNgn(String(data.balanceNgn || ''));
      const maxMo = data.policy?.maxRepaymentMonths || 12;
      setTermMonths(String(Math.min(maxMo, 6)));
    });
  }, [open, quotationRef]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const r = await createStaffPurchaseCredit({
      quotationRef,
      amountNgn: Number(amountNgn),
      termMonths: Number(termMonths) || undefined,
      reason: reason.trim(),
    });
    setSubmitting(false);
    const data = r.data || r;
    if (!r.ok || !data?.ok) {
      setError(data?.error || 'Request failed');
      return;
    }
    onSubmitted?.();
    onClose();
  }

  const maxSingle = status?.policy?.maxSinglePurchaseNgn;
  const maxMonths = status?.policy?.maxRepaymentMonths || 12;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-[#134e4a]">Staff purchase credit</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <p className="text-sm font-medium text-slate-600">
            Quotation <span className="font-bold text-slate-900">{quotationRef}</span>
          </p>
          {loading ? (
            <p className="text-sm text-slate-500">Loading balance…</p>
          ) : status ? (
            <div className="rounded-xl border border-teal-100 bg-teal-50/80 px-4 py-3 text-sm">
              <p className="font-bold text-teal-900">Outstanding: {formatNgn(status.balanceNgn)}</p>
              <p className="mt-1 text-xs text-teal-800/90">
                Credit is recovered via payroll. Branch manager approval required before delivery release.
              </p>
            </div>
          ) : null}
          {status?.account ? (
            <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Existing request: {status.account.status} · {formatNgn(status.account.principalOriginalNgn)}
            </p>
          ) : null}
          <label className="block text-xs font-bold text-slate-600">
            Credit amount (₦)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
              value={amountNgn}
              onChange={(e) => setAmountNgn(e.target.value)}
              required
              min={1}
              max={maxSingle || undefined}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Repayment months
            <span className="mt-0.5 block font-normal text-slate-400">
              Payroll deduction over 1–{maxMonths} months (max {maxMonths} = 1 year)
            </span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
              min={1}
              max={maxMonths}
              required
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Purpose / notes
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="e.g. Personal roofing — staff residence"
            />
          </label>
          {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading || Boolean(status?.account)}
              className="rounded-lg bg-[#134e4a] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Submit request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
