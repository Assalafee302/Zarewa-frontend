import React, { useEffect, useMemo, useState } from 'react';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalScrollFooter } from '../layout';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useRegisterSettlementMutations } from '../../hooks/useAccountingRegisterSettlements';
import { treasuryAccountDisplayName, treasuryAccountsForWorkspace } from '../../lib/treasuryAccountsStore';

/**
 * @param {{ settlement: object | null; open: boolean; onClose: () => void; onPaid: () => void }} props
 */
export function AccountingRegisterSettlementPayModal({ settlement, open, onClose, onPaid }) {
  const ws = useWorkspace();
  const { busy, error, paySettlement } = useRegisterSettlementMutations();
  const treasuryAccounts = useMemo(
    () => treasuryAccountsForWorkspace(ws?.snapshot, ws?.session),
    [ws?.snapshot, ws?.session]
  );
  const bankAccounts = useMemo(
    () =>
      treasuryAccounts.filter((a) => {
        const t = String(a.type || '').toLowerCase();
        return t === 'bank' || t === 'current' || t === 'savings' || !t;
      }),
    [treasuryAccounts]
  );

  const outstanding = Math.max(
    0,
    (settlement?.approvedAmountNgn || settlement?.amountNgn || 0) - (settlement?.paidAmountNgn || 0)
  );

  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [amountNgn, setAmountNgn] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !settlement) return;
    setAmountNgn(String(outstanding));
    setReference(settlement.settlementId || '');
    setNote(settlement.reason || '');
    if (bankAccounts.length) {
      setTreasuryAccountId(String(bankAccounts[0].id));
    }
  }, [open, settlement, outstanding, bankAccounts]);

  if (!open || !settlement) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = Math.round(Number(amountNgn) || 0);
    const result = await paySettlement(settlement.settlementId, {
      paymentLines: [
        {
          treasuryAccountId: Number(treasuryAccountId),
          amountNgn: amt,
          reference: reference.trim(),
          note: note.trim(),
        },
      ],
    });
    if (result.ok) onPaid();
  };

  return (
    <ModalFrame isOpen={open} onClose={onClose} title="Pay settlement" surface="plain">
      <ModalScrollShell size="md">
        <div className="h-1 shrink-0 bg-[#134e4a]" />
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <ModalScrollBody className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#134e4a]">Pay approved withdrawal</h2>
              <p className="mt-1 text-[10px] text-slate-500 sm:text-[11px]">
                {settlement.partyName} · {settlement.settlementId} · Outstanding {formatNgn(outstanding)}
              </p>
            </div>
            <ProcurementFormSection letter="P" title="Treasury payout" compact>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Pay from account *
                <select
                  className="z-finance-select"
                  value={treasuryAccountId}
                  onChange={(e) => setTreasuryAccountId(e.target.value)}
                  required
                >
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {treasuryAccountDisplayName(a)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-3">
                Amount (₦) *
                <input
                  type="number"
                  min="1"
                  max={outstanding}
                  className="z-finance-field"
                  value={amountNgn}
                  onChange={(e) => setAmountNgn(e.target.value)}
                  required
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-3">
                Reference
                <input className="z-finance-field" value={reference} onChange={(e) => setReference(e.target.value)} />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-3">
                Payment note
                <input className="z-finance-field" value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            </ProcurementFormSection>
            {error ? <p className="text-[10px] font-medium text-rose-700">{error}</p> : null}
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
              disabled={busy || !bankAccounts.length}
              className="min-h-11 rounded-lg bg-[#134e4a] text-white px-4 py-2 text-[10px] font-semibold uppercase disabled:opacity-50 sm:min-h-0 sm:py-1.5 sm:text-[9px]"
            >
              {busy ? 'Paying…' : 'Post payment'}
            </button>
          </ModalScrollFooter>
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}
