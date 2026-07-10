import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { formatNgn } from '../../lib/hrFormat';
import { createStaffPurchaseCredit, fetchQuotationStaffPurchaseStatus } from '../../lib/hrStaffPurchaseCredit';

/**
 * Request staff purchase credit against a quotation (staff-as-customer).
 * @param {{ open: boolean; onClose: () => void; quotationRef: string; onSubmitted?: () => void; selfInitiated?: boolean }} props
 */
export function StaffPurchaseCreditRequestModal({
  open,
  onClose,
  quotationRef,
  onSubmitted,
  selfInitiated = false,
}) {
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
      const bounds = data.amountBounds || {};
      const defaultAmt = bounds.maxCreditNgn > 0 ? bounds.maxCreditNgn : data.balanceNgn || '';
      setAmountNgn(String(defaultAmt || ''));
      const maxMo = data.policy?.maxRepaymentMonths || 12;
      setTermMonths(String(Math.min(maxMo, 3)));
    });
  }, [open, quotationRef]);

  const bounds = status?.amountBounds || {};
  const maxSingle = status?.policy?.maxSinglePurchaseNgn;
  const maxMonths = status?.policy?.maxRepaymentMonths || 12;
  const maxCredit = bounds.maxCreditNgn ?? status?.balanceNgn;
  const depositRequired = Number(bounds.depositRequiredNgn) || 0;
  const depositPct = Number(bounds.depositPct) || 0;

  const policyErrors = useMemo(() => {
    const errs = [];
    const amt = Math.round(Number(amountNgn) || 0);
    const elig = status?.eligibility;
    if (elig && !elig.eligible && elig.issues?.length) {
      errs.push(...elig.issues);
    }
    if (amt > 0 && maxCredit > 0 && amt > maxCredit) {
      errs.push(
        depositRequired > 0
          ? `Maximum credit after ${depositPct}% deposit is ${formatNgn(maxCredit)}.`
          : `Amount cannot exceed quotation balance (${formatNgn(maxCredit)}).`
      );
    }
    if (amt > 0 && maxSingle && amt > maxSingle) {
      errs.push(`Exceeds single purchase limit (${formatNgn(maxSingle)}).`);
    }
    const mo = Math.round(Number(termMonths) || 0);
    if (mo > maxMonths) {
      errs.push(`Repayment cannot exceed ${maxMonths} months.`);
    }
    return errs;
  }, [amountNgn, depositPct, depositRequired, maxCredit, maxMonths, maxSingle, status?.eligibility, termMonths]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    if (policyErrors.length) {
      setError(policyErrors[0]);
      return;
    }
    setSubmitting(true);
    setError('');
    const r = await createStaffPurchaseCredit({
      quotationRef,
      amountNgn: Number(amountNgn),
      termMonths: Number(termMonths) || undefined,
      reason: reason.trim(),
      selfInitiated,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-zarewa-teal">Staff purchase credit</h2>
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
              {depositRequired > 0 ? (
                <p className="mt-1 text-xs font-semibold text-amber-900">
                  Policy requires {depositPct}% deposit ({formatNgn(depositRequired)}) before credit. Max credit on this
                  quote: {formatNgn(maxCredit)}.
                </p>
              ) : null}
              <p className="mt-1 text-xs text-teal-800/90">
                Credit is recovered via payroll. Managing Director approval required before delivery release.
              </p>
            </div>
          ) : null}
          {status?.eligibility && !status.eligibility.eligible ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-950">
              <p className="font-bold">Staff not eligible</p>
              <ul className="mt-1 space-y-0.5">
                {(status.eligibility.issues || []).map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
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
              max={Math.min(maxCredit || Infinity, maxSingle || Infinity) || undefined}
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
          {policyErrors.length ? (
            <ul className="text-xs font-semibold text-amber-800 space-y-0.5">
              {policyErrors.map((pe) => (
                <li key={pe}>• {pe}</li>
              ))}
            </ul>
          ) : null}
          {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                loading ||
                Boolean(status?.account) ||
                (status?.eligibility && !status.eligibility.eligible) ||
                policyErrors.length > 0
              }
              className="rounded-lg bg-zarewa-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Submit request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
