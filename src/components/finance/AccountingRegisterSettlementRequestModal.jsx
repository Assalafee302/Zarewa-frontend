import React, { useEffect, useState } from 'react';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalScrollFooter } from '../layout';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import { formatNgn } from '../../Data/mockData';
import { useRegisterSettlementMutations } from '../../hooks/useAccountingRegisterSettlements';

function blockingLabel(item) {
  const reserved = item.reservedNgn ?? item.amountNgn ?? 0;
  if (item.status === 'Approved') {
    const out = Math.max(0, (item.approvedAmountNgn || item.amountNgn || 0) - (item.paidAmountNgn || 0));
    return `${item.settlementId} · Approved · ${formatNgn(out)} unpaid`;
  }
  return `${item.settlementId} · Pending · ${formatNgn(reserved)} reserved`;
}

/**
 * @param {{ item: object; open: boolean; onClose: () => void; onSaved: () => void }} props
 */
export function AccountingRegisterSettlementRequestModal({ item, open, onClose, onSaved }) {
  const { busy, error, fetchAvailable, createSettlement } = useRegisterSettlementMutations();
  const [availableNgn, setAvailableNgn] = useState(0);
  const [reservedNgn, setReservedNgn] = useState(0);
  const [blockingItems, setBlockingItems] = useState([]);
  const [amountNgn, setAmountNgn] = useState('');
  const [reason, setReason] = useState('');
  const [payeeName, setPayeeName] = useState(item?.partyName || '');
  const [payeeBankDetails, setPayeeBankDetails] = useState('');
  const [validationError, setValidationError] = useState('');
  const [capacityError, setCapacityError] = useState('');

  useEffect(() => {
    if (!open || !item?.id) return;
    setValidationError('');
    setCapacityError('');
    setPayeeName(item.partyName || '');
    setReason(item.description || item.detail || '');
    void fetchAvailable(item.id).then((r) => {
      if (!r.ok) {
        setAvailableNgn(0);
        setReservedNgn(0);
        setBlockingItems([]);
        setAmountNgn('');
        setCapacityError(r.error || 'Could not load settlement capacity for this line.');
        return;
      }
      const avail = r.availableNgn ?? 0;
      setAvailableNgn(avail);
      setReservedNgn(r.reservedNgn ?? Math.max(0, (r.openNgn ?? item.amountNgn ?? 0) - avail));
      setBlockingItems(r.blockingItems || []);
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
                {item.partyName} · Open balance {formatNgn(item.amountNgn)} · Reserved {formatNgn(reservedNgn)} ·
                Available to request {formatNgn(availableNgn)}.
              </p>
            </div>
            {!canRequest ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-950 leading-relaxed space-y-2">
                <p>
                  The full open balance is already reserved. Reject a duplicate pending request, or pay an approved
                  one, before submitting a new withdrawal.
                </p>
                {blockingItems.length ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">Blocking requests</p>
                    <ul className="mt-1.5 space-y-1">
                      {blockingItems.map((s) => (
                        <li key={s.settlementId} className="rounded-md border border-amber-200/80 bg-white/70 px-2.5 py-1.5 text-[10px] font-medium text-amber-950">
                          {blockingLabel(s)}
                          {s.reason ? <span className="block text-[9px] font-normal text-amber-900/80 mt-0.5">{s.reason}</span> : null}
                        </li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-amber-900/90 mt-2">
                      Close this form, open the register line detail, and use <span className="font-bold">Withdraw</span>{' '}
                      on your own pending request, or ask MD/finance to approve/reject. Approved requests must be paid or
                      rejected from the Debtors tab.
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] font-medium text-amber-900">
                    Reserved balance is {formatNgn(reservedNgn)} but no active requests were returned. Refresh the page
                    after backend deploy, or ask support to check settlement records for this line.
                  </p>
                )}
              </div>
            ) : null}
            {capacityError ? (
              <p className="text-[10px] font-medium text-rose-700">{capacityError}</p>
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
