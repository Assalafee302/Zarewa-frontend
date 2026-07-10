import React, { useEffect, useState } from 'react';
import { formatNgn } from '../../Data/mockData';
import { fetchQuotationCreditStatus, submitCreditExceptionRequest } from '../../hooks/useCreditExceptions';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalActionFooter } from '../layout';
import { InlineLoader } from '../ui/PageLoader';
import { FieldLabel, Input, Textarea } from '../ui/Input';

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
    <ModalFrame isOpen={open} onClose={onClose} title="Request delivery credit" surface="plain">
      <ModalScrollShell size="md">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <ModalScrollBody className="space-y-4">
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
              <InlineLoader message="Loading outstanding balance…" />
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
            <div>
              <FieldLabel htmlFor="credit-amount" required>
                Credit amount (₦)
              </FieldLabel>
              <Input
                id="credit-amount"
                type="number"
                value={amountNgn}
                onChange={(e) => setAmountNgn(e.target.value)}
                required
                min={1}
              />
            </div>
            <div>
              <FieldLabel htmlFor="credit-reason" required>
                Reason
              </FieldLabel>
              <Textarea id="credit-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required />
            </div>
            <div>
              <FieldLabel htmlFor="credit-terms">Payment terms (days)</FieldLabel>
              <Input
                id="credit-terms"
                type="number"
                value={termsDays}
                onChange={(e) => setTermsDays(e.target.value)}
                min={1}
                max={status?.policy?.maxTermsDays || 90}
              />
            </div>
            {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
          </ModalScrollBody>
          <ModalActionFooter
            onCancel={onClose}
            cancelDisabled={submitting}
            confirmType="submit"
            confirmLabel="Submit request"
            confirmDisabled={submitting || loading}
            confirmLoading={submitting}
          />
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}
