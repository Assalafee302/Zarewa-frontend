import React, { useMemo, useState } from 'react';
import { Banknote, Check, X } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useRegisterSettlements, useRegisterSettlementMutations } from '../../hooks/useAccountingRegisterSettlements';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AccountingRegisterSettlementPayModal } from './AccountingRegisterSettlementPayModal';
import { AccountingRegisterSettlementDecisionModal } from './AccountingRegisterSettlementDecisionModal';

const STATUS_TONE = {
  Pending: 'bg-amber-50 text-amber-900 border-amber-200',
  Approved: 'bg-teal-50 text-teal-900 border-teal-200',
  Paid: 'bg-slate-100 text-slate-700 border-slate-200',
  Rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

/**
 * Approved settlements awaiting cashier payout + pending for approvers.
 * @param {{ branchId?: string | null; onChanged?: () => void }} props
 */
export function AccountingRegisterSettlementsPanel({ branchId, onChanged }) {
  const ws = useWorkspace();
  const { items, reload } = useRegisterSettlements({ branchId, enabled: true });
  const { busy } = useRegisterSettlementMutations();
  const [payTarget, setPayTarget] = useState(null);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionMode, setDecisionMode] = useState('Approved');

  const canApprove =
    ws?.hasPermission?.('finance.approve') ||
    ws?.hasPermission?.('refunds.approve') ||
    ws?.hasPermission?.('*');
  const canPay = ws?.hasPermission?.('finance.pay');

  const pending = useMemo(() => items.filter((i) => i.status === 'Pending'), [items]);
  const approved = useMemo(() => items.filter((i) => i.status === 'Approved'), [items]);

  const openDecision = (settlement, status) => {
    setDecisionTarget(settlement);
    setDecisionMode(status);
  };

  if (!pending.length && !approved.length) return null;

  return (
    <>
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="h-1 bg-zarewa-teal" />
        <div className="p-4 space-y-3">
          <p className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">Register withdrawals</p>

          {pending.length ? (
            <div>
              <p className="text-ui-xs font-semibold uppercase text-amber-800 mb-1.5">Awaiting approval ({pending.length})</p>
              <ul className="space-y-1.5">
                {pending.map((s) => (
                  <li
                    key={s.settlementId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zarewa-teal truncate">{s.partyName}</p>
                      <p className="text-ui-xs text-slate-600">
                        {s.settlementId} · {formatNgn(s.amountNgn)}
                      </p>
                    </div>
                    {canApprove ? (
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openDecision(s, 'Approved')}
                          className="inline-flex items-center gap-0.5 rounded border border-teal-200 bg-teal-50 px-2 py-1 text-ui-xs font-bold uppercase text-teal-900"
                        >
                          <Check size={10} /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openDecision(s, 'Rejected')}
                          className="inline-flex items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-ui-xs font-bold uppercase text-rose-800"
                        >
                          <X size={10} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`text-ui-xs font-bold uppercase px-2 py-0.5 rounded border ${STATUS_TONE.Pending}`}>
                        Pending
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {approved.length ? (
            <div>
              <p className="text-ui-xs font-semibold uppercase text-teal-800 mb-1.5">Approved — pay from treasury ({approved.length})</p>
              <ul className="space-y-1.5">
                {approved.map((s) => {
                  const out = Math.max(0, (s.approvedAmountNgn || s.amountNgn) - (s.paidAmountNgn || 0));
                  return (
                    <li
                      key={s.settlementId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zarewa-teal truncate">{s.partyName}</p>
                        <p className="text-ui-xs text-slate-600">
                          {s.settlementId} · Pay {formatNgn(out)}
                        </p>
                      </div>
                      {canPay ? (
                        <button
                          type="button"
                          onClick={() => setPayTarget(s)}
                          className="inline-flex items-center gap-1 rounded-lg bg-zarewa-teal text-white px-2.5 py-1 text-ui-xs font-bold uppercase"
                        >
                          <Banknote size={10} /> Pay
                        </button>
                      ) : (
                        <span className={`text-ui-xs font-bold uppercase px-2 py-0.5 rounded border ${STATUS_TONE.Approved}`}>
                          Approved
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <AccountingRegisterSettlementDecisionModal
        settlement={decisionTarget}
        open={Boolean(decisionTarget)}
        mode={decisionMode}
        onClose={() => setDecisionTarget(null)}
        onDone={() => {
          void reload();
          void ws?.refresh?.();
          onChanged?.();
        }}
      />
      <AccountingRegisterSettlementPayModal
        settlement={payTarget}
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        onPaid={() => {
          setPayTarget(null);
          void reload();
          void ws?.refresh?.();
          onChanged?.();
        }}
      />
    </>
  );
}
