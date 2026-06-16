import React, { useEffect, useState } from 'react';
import { ModalFrame } from '../layout/ModalFrame';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import { formatNgn } from '../../Data/mockData';
import { useRegisterSettlementMutations } from '../../hooks/useAccountingRegisterSettlements';

const INPUT =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#134e4a]/35 focus:ring-2 focus:ring-[#134e4a]/10';

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

  useEffect(() => {
    if (!open || !item?.id) return;
    setPayeeName(item.partyName || '');
    setReason(item.description || item.detail || '');
    void fetchAvailable(item.id).then((r) => {
      const avail = r.availableNgn ?? item.amountNgn ?? 0;
      setAvailableNgn(avail);
      setAmountNgn(String(avail));
    });
  }, [open, item, fetchAvailable]);

  if (!open || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await createSettlement(item.id, {
      amountNgn: Math.round(Number(amountNgn) || 0),
      reason: reason.trim(),
      payeeName: payeeName.trim(),
      payeeBankDetails: payeeBankDetails.trim() || undefined,
      branchId: item.branchId || undefined,
    });
    if (result.ok) onSaved();
  };

  return (
    <ModalFrame isOpen={open} onClose={onClose} title="Request withdrawal" surface="plain">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden">
        <div className="h-1 bg-[#134e4a]" />
        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#134e4a]">Request register withdrawal</h2>
          <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
            {item.partyName} · Open balance {formatNgn(item.amountNgn)} · Available to request{' '}
            {formatNgn(availableNgn)} (after other pending settlements).
          </p>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <ProcurementFormSection letter="1" title="Withdrawal" compact>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Amount (₦) *
                <input
                  type="number"
                  min="1"
                  max={availableNgn}
                  className={INPUT}
                  value={amountNgn}
                  onChange={(e) => setAmountNgn(e.target.value)}
                  required
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-3">
                Reason *
                <textarea className={INPUT} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required />
              </label>
            </ProcurementFormSection>
            <ProcurementFormSection letter="2" title="Payee" compact>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Payee name *
                <input className={INPUT} value={payeeName} onChange={(e) => setPayeeName(e.target.value)} required />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-3">
                Bank details
                <textarea
                  className={INPUT}
                  rows={2}
                  value={payeeBankDetails}
                  onChange={(e) => setPayeeBankDetails(e.target.value)}
                  placeholder="Bank, account name, account number"
                />
              </label>
            </ProcurementFormSection>
            {error ? <p className="text-[10px] font-medium text-rose-700">{error}</p> : null}
            <p className="text-[10px] text-slate-500">
              After submit: MD or finance approves → Cashier pays from treasury → Debtors line reduces automatically.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[9px] font-semibold uppercase text-slate-700">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase disabled:opacity-50">
                {busy ? 'Submitting…' : 'Submit for approval'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalFrame>
  );
}
