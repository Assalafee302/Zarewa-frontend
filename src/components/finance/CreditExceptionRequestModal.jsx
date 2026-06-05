import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { fetchQuotationCreditStatus, submitCreditExceptionRequest } from '../../hooks/useCreditExceptions';

/**
 * @param {{ open: boolean; onClose: () => void; quotationRef: string; onSubmitted?: () => void }} props
 */
export function CreditExceptionRequestModal({ open, onClose, quotationRef, onSubmitted }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [amountNgn, setAmountNgn] = useState('');
  const [reason, setReason] = useState('');
  const [termsDays, setTermsDays] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !quotationRef) return;
    setLoading(true);
    setError('');
    fetchQuotationCreditStatus(quotationRef).then((r) => {
      setLoading(false);
      if (!r.ok) {
        setStatus(null);
        setError(r.error || 'Could not load quote');
        return;
      }
      setStatus(r);
      setAmountNgn(String(r.outstandingNgn || ''));
      setTermsDays(String(r.policy?.defaultTermsDays || 14));
    });
  }, [open, quotationRef]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const r = await submitCreditExceptionRequest({
      quotationRef,
      amountNgn: Number(amountNgn),
      reason,
      creditTermsDays: Number(termsDays) || undefined,
    });
    setSubmitting(false);
    if (!r.ok) {
      setError(r.error || 'Request failed');
      return;
    }
    onSubmitted?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-[#134e4a]">Request delivery credit</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <p className="text-sm font-medium text-slate-600">
            Quotation <span className="font-bold text-slate-900">{quotationRef}</span>
            {status?.customerId ? (
              <>
                {' '}
                · Customer <span className="font-semibold">{status.customerId}</span>
              </>
            ) : null}
          </p>
          {loading ? (
            <p className="text-sm text-slate-500">Loading outstanding balance…</p>
          ) : status ? (
            <div className="rounded-xl bg-teal-50/80 border border-teal-100 px-4 py-3 text-sm">
              <p className="font-bold text-teal-900">Outstanding: {formatNgn(status.outstandingNgn)}</p>
              <p className="text-xs text-teal-800/90 mt-1">
                Receivable after production: {formatNgn(status.receivableNgn)}. Credit does not clear debt — it
                allows delivery only.
              </p>
            </div>
          ) : null}
          {status?.policy?.policyNote ? (
            <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {status.policy.policyNote}
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
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Reason
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Payment terms (days)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={termsDays}
              onChange={(e) => setTermsDays(e.target.value)}
              min={1}
              max={status?.policy?.maxTermsDays || 90}
            />
          </label>
          {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
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
