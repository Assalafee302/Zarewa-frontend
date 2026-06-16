import React, { useEffect, useState } from 'react';
import { ModalFrame } from '../layout/ModalFrame';
import { formatNgn } from '../../Data/mockData';
import { useRegisterSettlementMutations } from '../../hooks/useAccountingRegisterSettlements';

/**
 * @param {{
 *   settlement: object | null;
 *   open: boolean;
 *   mode: 'Approved' | 'Rejected';
 *   onClose: () => void;
 *   onDone?: () => void;
 * }} props
 */
export function AccountingRegisterSettlementDecisionModal({ settlement, open, mode, onClose, onDone }) {
  const { busy, error, decideSettlement } = useRegisterSettlementMutations();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) setNote('');
  }, [open, settlement?.settlementId, mode]);

  if (!open || !settlement) return null;

  const isApprove = mode === 'Approved';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await decideSettlement(settlement.settlementId, { status: mode, note: note.trim() });
    if (result.ok) {
      onDone?.();
      onClose();
    }
  };

  return (
    <ModalFrame
      isOpen={open}
      onClose={onClose}
      title={isApprove ? 'Approve withdrawal' : 'Reject withdrawal'}
      surface="plain"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden">
        <div className={`h-1 ${isApprove ? 'bg-teal-700' : 'bg-rose-700'}`} />
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#134e4a]">
              {isApprove ? 'Approve withdrawal' : 'Reject withdrawal'}
            </h2>
            <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
              {settlement.partyName} · {settlement.settlementId} · {formatNgn(settlement.amountNgn)}
            </p>
            {settlement.reason ? (
              <p className="mt-2 text-[11px] text-slate-600 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                {settlement.reason}
              </p>
            ) : null}
          </div>

          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {isApprove ? 'Approval note (optional)' : 'Rejection note (optional)'}
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-800 outline-none focus:border-[#134e4a]/35 focus:ring-2 focus:ring-[#134e4a]/10"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for audit trail"
            />
          </label>

          {error ? <p className="text-[10px] font-semibold text-rose-700">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[9px] font-semibold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`rounded-lg px-3 py-1.5 text-[9px] font-semibold uppercase text-white disabled:opacity-50 ${
                isApprove ? 'bg-teal-800 hover:bg-teal-900' : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {busy ? 'Saving…' : isApprove ? 'Confirm approval' : 'Confirm rejection'}
            </button>
          </div>
        </form>
      </div>
    </ModalFrame>
  );
}
