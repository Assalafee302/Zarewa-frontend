import React, { useEffect, useState } from 'react';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalScrollFooter } from '../layout';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import { formatNgn } from '../../Data/mockData';
import { useRegisterSettlementMutations } from '../../hooks/useAccountingRegisterSettlements';

/**
 * @param {{ item: object; open: boolean; onClose: () => void; onSaved: () => void }} props
 */
export function AccountingRegisterSettlementRequestModal({ item, open, onClose, onSaved }) {
  const { busy, error, fetchAvailable, createSettlement } = useRegisterSettlementMutations();
  const [availableNgn, setAvailableNgn] = useState(0);
  const [amountNgn, setAmountNgn] = useState('');
  const [reason, setReason] = useState('');
  const [payeeName, setPayeeName] = useState(item?.partyName || '');
  const [payeeBankDetails, setPayeeBankDetails] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!open || !item?.id) return;
    setValidationError('');
    setPayeeName(item.partyName || '');
    setReason(item.description || item.detail || '');
    void fetchAvailable(item.id).then((r) => {
      const avail = r.availableNgn ?? item.amountNgn ?? 0;
      setAvailableNgn(avail);
      setAmountNgn(avail > 0 ? String(avail) : '');
    });
  }, [open, item, fetchAvailable]);

  if (!open || !item) return null;

  const canRequest = availableNgn > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    if (!canRequest) {
      setValidationError(
        'Nothing is available to request — pending or approved unpaid withdrawals already hold the full open balance on this line.'
      );
      return;
    }
    const amt = Math.round(Number(amountNgn) || 0);
    if (amt <= 0) {
      setValidationError('Enter an amount greater than zero.');
      return;
    }
    if (amt > availableNgn) {
      setValidationError(`Amount exceeds available balance (${formatNgn(availableNgn)}).`);
      return;
    }
    const result = await createSettlement(item.id, {
      amountNgn: amt,
      reason: reason.trim(),
      payeeName: payeeName.trim(),
      payeeBankDetails: payeeBankDetails.trim() || undefined,
      branchId: item.branchId || undefined,
    });
    if (result.ok) onSaved();
  };

  return (
    <ModalFrame isOpen={open} onClose={onClose} title="Request withdrawal" surface="plain">
      <ModalScrollShell size="md">
        <div className="h-1 shrink-0 bg-[#134e4a]" />
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <ModalScrollBody className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#134e4a]">Request register withdrawal</h2>
              <p className="mt-1 text-[10px] text-slate-500 leading-relaxed sm:text-[11px]">
                {item.partyName} · Open balance {formatNgn(item.amountNgn)} · Available to request{' '}
                {formatNgn(availableNgn)} (after other pending settlements).
              </p>
            </div>
            {!canRequest ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-950 leading-relaxed">
                The full open balance is already reserved by other pending or approved unpaid withdrawals on this
                line. Close this form, review existing withdrawal requests on the register line, and reject or pay
                them before submitting a new request.
              </div>
            ) : null}
            <ProcurementFormSection letter="1" title="Withdrawal" compact>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Amount (₦) *
                <input
                  type="number"
                  {...(canRequest ? { min: 1, max: availableNgn } : {})}
                  className="z-finance-field disabled:opacity-60"
                  value={amountNgn}
                  onChange={(e) => setAmountNgn(e.target.value)}
                  disabled={!canRequest}
                  required={canRequest}
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-3">
                Reason *
                <textarea
                  className="z-finance-field font-medium"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </label>
            </ProcurementFormSection>
            <ProcurementFormSection letter="2" title="Payee" compact>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Payee name *
                <input className="z-finance-field" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} required />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-3">
                Bank details
                <textarea
                  className="z-finance-field font-medium"
                  rows={2}
                  value={payeeBankDetails}
                  onChange={(e) => setPayeeBankDetails(e.target.value)}
                  placeholder="Bank, account name, account number"
                />
              </label>
            </ProcurementFormSection>
            {validationError ? <p className="text-[10px] font-medium text-rose-700">{validationError}</p> : null}
            {error ? <p className="text-[10px] font-medium text-rose-700">{error}</p> : null}
            <p className="text-[10px] text-slate-500">
              After submit: MD or finance approves → Cashier pays from treasury → Debtors line reduces automatically.
            </p>
          </ModalScrollBody>
          <ModalScrollFooter className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-semibold uppercase text-slate-700 sm:min-h-0 sm:py-1.5 sm:text-[9px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !canRequest}
              className="min-h-11 rounded-lg bg-[#134e4a] text-white px-4 py-2 text-[10px] font-semibold uppercase disabled:opacity-50 sm:min-h-0 sm:py-1.5 sm:text-[9px]"
            >
              {busy ? 'Submitting…' : 'Submit for approval'}
            </button>
          </ModalScrollFooter>
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}
