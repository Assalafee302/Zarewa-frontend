import React, { useEffect, useState } from 'react';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalScrollFooter } from '../layout';
import { formatNgn } from '../../Data/mockData';
import { useRegisterSettlementMutations } from '../../hooks/useAccountingRegisterSettlements';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { isExecutiveRoleKey } from '../../lib/workspaceGovernanceClient';

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
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) setNote('');
  }, [open, settlement?.settlementId, mode]);

  if (!open || !settlement) return null;

  const isApprove = mode === 'Approved';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = Math.round(Number(settlement.amountNgn) || 0);
    const refundHi =
      Number(ws?.snapshot?.orgGovernanceLimits?.refundExecutiveThresholdNgn) || 1_000_000;
    const roleKey = String(ws?.session?.user?.roleKey || '').trim().toLowerCase();
    const isExec = isExecutiveRoleKey(roleKey) || ws?.hasPermission?.('*');
    if (mode === 'Approved' && amount > refundHi && !isExec) {
      showToast(`Withdrawals above ${formatNgn(refundHi)} require Managing Director approval.`, {
        variant: 'error',
      });
      return;
    }
    const result = await decideSettlement(settlement.settlementId, {
      status: mode,
      note: note.trim() || (mode === 'Approved' ? 'Approved' : 'Rejected'),
      ...(mode === 'Approved' && amount > 0 ? { approvedAmountNgn: amount } : {}),
    });
    if (result.ok) {
      showToast(mode === 'Approved' ? 'Withdrawal approved.' : 'Withdrawal rejected.', {
        variant: 'success',
      });
      onDone?.();
      onClose();
    } else {
      showToast(result.error || error || 'Could not record decision.', { variant: 'error' });
    }
  };

  return (
    <ModalFrame
      isOpen={open}
      onClose={onClose}
      title={isApprove ? 'Approve withdrawal' : 'Reject withdrawal'}
      surface="plain"
    >
      <ModalScrollShell size="sm">
        <div className={`h-1 shrink-0 ${isApprove ? 'bg-teal-700' : 'bg-rose-700'}`} />
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ModalScrollBody className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#134e4a]">
                {isApprove ? 'Approve withdrawal' : 'Reject withdrawal'}
              </h2>
              <p className="mt-1 text-[10px] text-slate-500 leading-relaxed sm:text-[11px]">
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
                className="z-finance-field mt-1 font-medium"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for audit trail"
              />
            </label>

            {error ? <p className="text-[10px] font-semibold text-rose-700">{error}</p> : null}
          </ModalScrollBody>

          <ModalScrollFooter className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-semibold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:min-h-0 sm:py-1.5 sm:text-[9px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`min-h-11 rounded-lg px-4 py-2 text-[10px] font-semibold uppercase text-white disabled:opacity-50 sm:min-h-0 sm:py-1.5 sm:text-[9px] ${
                isApprove ? 'bg-teal-800 hover:bg-teal-900' : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {busy ? 'Saving…' : isApprove ? 'Confirm approval' : 'Confirm rejection'}
            </button>
          </ModalScrollFooter>
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}
