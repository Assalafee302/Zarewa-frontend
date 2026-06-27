import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Wallet, X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useRegisterSettlementMutations } from '../../hooks/useAccountingRegisterSettlements';
import { createRequestPayLine, mapTreasuryPayoutLinesForApi } from '../../lib/accountCore';
import { registerSettlementOutstandingNgn } from '../../lib/registerSettlementPay';
import { treasuryAccountDisplayName, treasuryAccountsForWorkspace } from '../../lib/treasuryAccountsStore';

import {
  findTreasuryPayoutShortAccount,
  treasuryBookBalanceByAccountId,
  treasuryBookDisplayNgn,
} from '../../lib/financeDeskTreasury';

/**
 * @param {{ settlement: object | null; open: boolean; onClose: () => void; onPaid: () => void }} props
 */
export function AccountingRegisterSettlementPayModal({ settlement, open, onClose, onPaid }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const { busy, error, paySettlement } = useRegisterSettlementMutations();

  const treasuryMovements = useMemo(
    () => (Array.isArray(ws?.snapshot?.treasuryMovements) ? ws.snapshot.treasuryMovements : []),
    [ws?.snapshot?.treasuryMovements]
  );

  const treasuryAccounts = useMemo(
    () => treasuryAccountsForWorkspace(ws?.snapshot, ws?.session),
    [ws?.snapshot, ws?.session]
  );

  const treasuryBookByAccountId = useMemo(
    () => treasuryBookBalanceByAccountId(treasuryAccounts, treasuryMovements),
    [treasuryAccounts, treasuryMovements]
  );

  const bankAccountsSelectOrder = useMemo(
    () =>
      [...treasuryAccounts].sort((a, b) =>
        treasuryAccountDisplayName(a).localeCompare(treasuryAccountDisplayName(b), undefined, {
          sensitivity: 'base',
        })
      ),
    [treasuryAccounts]
  );

  const defaultAccountId = bankAccountsSelectOrder[0]?.id ?? '';

  const approvedNgn = Math.round(Number(settlement?.approvedAmountNgn ?? settlement?.amountNgn) || 0);
  const paidNgn = Math.round(Number(settlement?.paidAmountNgn) || 0);
  const outstanding = settlement ? registerSettlementOutstandingNgn(settlement) : 0;

  const activeActorLabel = ws?.session?.user?.displayName ?? 'Finance';

  const [paidBy, setPaidBy] = useState('');
  const [payLines, setPayLines] = useState([]);
  const [paymentNote, setPaymentNote] = useState('');

  const resetForm = useCallback(() => {
    setPaidBy('');
    setPayLines([]);
    setPaymentNote('');
  }, []);

  useEffect(() => {
    if (!open || !settlement) return;
    setPaidBy('');
    setPaymentNote(settlement.paymentNote || settlement.reason || '');
    setPayLines([createRequestPayLine(defaultAccountId, outstanding > 0 ? outstanding : '')]);
  }, [open, settlement, outstanding, defaultAccountId]);

  const payTotalNgn = useMemo(
    () => payLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [payLines]
  );

  const updatePayLine = (lineId, patch) => {
    setPayLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const addPayLine = () => {
    setPayLines((prev) => [...prev, createRequestPayLine(defaultAccountId)]);
  };

  const removePayLine = (lineId) => {
    setPayLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== lineId)));
  };

  const handleClose = () => {
    if (busy) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!settlement?.settlementId || busy) return;

    const paidByLabel = paidBy.trim() || activeActorLabel;
    const validLines = mapTreasuryPayoutLinesForApi(payLines);
    if (validLines.length === 0) {
      showToast('Add at least one payout line.', { variant: 'error' });
      return;
    }
    if (payTotalNgn <= 0) {
      showToast('Payout total must be positive.', { variant: 'error' });
      return;
    }
    if (payTotalNgn > outstanding) {
      showToast('Payout exceeds the approved outstanding balance.', { variant: 'error' });
      return;
    }

    const shortAccount = findTreasuryPayoutShortAccount(
      validLines,
      bankAccountsSelectOrder,
      treasuryBookByAccountId
    );
    if (shortAccount) {
      showToast(`Insufficient balance in ${shortAccount.name}.`, { variant: 'error' });
      return;
    }

    const result = await paySettlement(settlement.settlementId, {
      paidBy: paidByLabel,
      paymentNote: paymentNote.trim(),
      note: paymentNote.trim(),
      paymentLines: validLines.map((line) => ({
        treasuryAccountId: line.treasuryAccountId,
        amountNgn: line.amountNgn,
        reference: line.reference || settlement.settlementId,
        note: paymentNote.trim(),
        dateISO: line.dateISO,
      })),
    });

    if (result.ok) {
      resetForm();
      onPaid();
    }
  };

  if (!open || !settlement) return null;

  return (
    <ModalFrame isOpen={open} onClose={handleClose}>
      <div className="z-modal-panel z-modal-scroll-y max-w-lg p-4 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-[#134e4a] flex items-center gap-2">
            <Wallet size={22} className="text-teal-700" />
            Register withdrawal payout
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="p-2 text-gray-400 hover:text-red-500 rounded-xl disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="bg-teal-50/80 rounded-2xl p-4 border border-teal-100 text-sm space-y-1">
            <p className="font-mono font-bold text-[#134e4a]">{settlement.settlementId}</p>
            <p className="font-bold text-gray-800">{settlement.partyName || 'Register party'}</p>
            {settlement.reason ? <p className="text-xs text-gray-600">{settlement.reason}</p> : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[10px]">
              <div>
                <p className="uppercase text-gray-400 font-bold tracking-wide">Requested by</p>
                <p className="font-semibold text-gray-800">{settlement.requestedByName || '—'}</p>
              </div>
              <div>
                <p className="uppercase text-gray-400 font-bold tracking-wide">Approved by</p>
                <p className="font-semibold text-gray-800">{settlement.approvedByName || '—'}</p>
              </div>
            </div>
            {(settlement.payeeName || settlement.payeeBankDetails) ? (
              <div className="mt-2 rounded-xl border border-sky-200/90 bg-sky-50/95 px-3 py-2.5 text-[11px] text-sky-950 space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wide text-sky-900/90">Pay to (from request)</p>
                {settlement.payeeName ? (
                  <p className="font-bold text-sky-950">{settlement.payeeName}</p>
                ) : null}
                {settlement.payeeBankDetails ? (
                  <p className="font-mono text-[11px] font-semibold leading-snug">{settlement.payeeBankDetails}</p>
                ) : null}
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-3 pt-2 text-[10px] text-gray-600 tabular-nums">
              <div>
                <p className="uppercase text-gray-400">Approved</p>
                <p className="text-sm font-black text-[#134e4a]">{formatNgn(approvedNgn)}</p>
              </div>
              <div>
                <p className="uppercase text-gray-400">Paid</p>
                <p className="text-sm font-black text-[#134e4a]">{formatNgn(paidNgn)}</p>
              </div>
              <div>
                <p className="uppercase text-gray-400">Balance</p>
                <p className="text-sm font-black text-teal-800">{formatNgn(outstanding)}</p>
              </div>
            </div>
          </div>

          {bankAccountsSelectOrder.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Add at least one treasury account before posting payout.
            </p>
          ) : (
            <>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Paid by (Finance user)
                </label>
                <input
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  placeholder="e.g. Hauwa — GTBank transfer"
                  className="w-full z-finance-field rounded-xl font-bold outline-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Payout breakdown</label>
                <button
                  type="button"
                  onClick={addPayLine}
                  className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#134e4a]"
                >
                  <Plus size={14} /> Add line
                </button>
              </div>

              <div className="space-y-1.5">
                {payLines.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-2 px-2.5 shadow-sm flex flex-col gap-2"
                  >
                    <select
                      value={line.treasuryAccountId}
                      onChange={(e) => updatePayLine(line.id, { treasuryAccountId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-[11px] font-semibold"
                    >
                      <option value="">Select account…</option>
                      {bankAccountsSelectOrder.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a, treasuryBookByAccountId))})
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <input
                        type="date"
                        value={line.dateISO}
                        onChange={(e) => updatePayLine(line.id, { dateISO: e.target.value })}
                        className="w-full z-finance-field rounded-lg font-semibold"
                        title="Payment date"
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        max={outstanding}
                        value={line.amount}
                        onChange={(e) => updatePayLine(line.id, { amount: e.target.value })}
                        className="sm:col-span-3 z-finance-field rounded-lg font-bold text-[#134e4a]"
                        placeholder="Amount ₦"
                      />
                      <input
                        type="text"
                        value={line.reference}
                        onChange={(e) => updatePayLine(line.id, { reference: e.target.value })}
                        className="sm:col-span-4 z-finance-field rounded-lg"
                        placeholder="Reference"
                      />
                      <button
                        type="button"
                        onClick={() => removePayLine(line.id)}
                        className="sm:col-span-2 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-500"
                        title="Remove line"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Payment note
                </label>
                <input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Example: Cash 300,000 and GT transfer 200,000"
                  className="w-full z-finance-field rounded-xl outline-none"
                />
              </div>

              <div className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md px-3 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">This payout</span>
                  <span className="font-black text-[#134e4a]">{formatNgn(payTotalNgn)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">
                    Remaining after post
                  </span>
                  <span className="font-black text-gray-700">{formatNgn(Math.max(0, outstanding - payTotalNgn))}</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-500 leading-relaxed">
                Saving this payout writes treasury movements and reduces the register line balance. The withdrawal stays
                open until the approved amount is fully paid.
              </p>

              {error ? <p className="text-[11px] font-medium text-rose-700">{error}</p> : null}

              <button
                type="submit"
                disabled={busy}
                className="z-btn-primary w-full justify-center py-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {busy ? 'Posting payout…' : 'Post withdrawal payout'}
              </button>
            </>
          )}
        </form>
      </div>
    </ModalFrame>
  );
}
