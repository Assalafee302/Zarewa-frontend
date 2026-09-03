import React, { useMemo, useState } from 'react';
import { Banknote, Users, Wallet } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { ModalFrame } from '../layout';
import { userMayPayCustomerRefund, MD_REFUND_PAY_BLOCKED_MESSAGE } from '../../lib/refundsStore';
import {
  FinanceDeskColoredQueuePanel,
  FinanceDeskColoredQueueRow,
  FinanceDeskQueueActionButton,
} from './FinanceDeskColoredQueuePanel';

/**
 * Partner wallets — BM-approved refund balances; cashier releases full or partial (no re-approval).
 */
export function PartnerWalletCashierPanel({
  balances: balancesProp,
  treasuryAccounts = [],
  canPay = true,
  expanded: expandedProp,
  onExpandedChange,
  onWithdrawn,
}) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [expandedInternal, setExpandedInternal] = useState(true);
  const expanded = expandedProp ?? expandedInternal;
  const setExpanded = (next) => {
    const value = typeof next === 'function' ? next(expanded) : next;
    onExpandedChange?.(value);
    if (expandedProp === undefined) setExpandedInternal(value);
  };

  const balances = useMemo(() => {
    if (Array.isArray(balancesProp)) return balancesProp;
    return Array.isArray(ws?.snapshot?.partnerWalletsDue) ? ws.snapshot.partnerWalletsDue : [];
  }, [balancesProp, ws?.snapshot?.partnerWalletsDue]);

  const policyOn = Boolean(ws?.snapshot?.partnerWalletPolicy?.enabled);
  const accounts = useMemo(
    () => (Array.isArray(treasuryAccounts) ? treasuryAccounts : []),
    [treasuryAccounts]
  );

  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [amount, setAmount] = useState('');
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [credits, setCredits] = useState([]);

  const openWithdraw = async (row) => {
    setWithdrawTarget(row);
    setAmount(String(Math.round(Number(row.balanceNgn) || 0)));
    setTreasuryAccountId(accounts[0]?.id != null ? String(accounts[0].id) : '');
    setReference('');
    setNote('');
    setCredits([]);
    const { ok, data } = await apiFetch(
      `/api/partner-wallets/${encodeURIComponent(row.partyKind)}/${encodeURIComponent(row.partyId)}/credits`
    );
    if (ok && Array.isArray(data?.credits)) setCredits(data.credits);
  };

  const submitWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawTarget || busy) return;
    if (!canPay || !userMayPayCustomerRefund(ws) || !ws?.canMutate) {
      showToast(
        !userMayPayCustomerRefund(ws)
          ? MD_REFUND_PAY_BLOCKED_MESSAGE
          : 'Connect with finance.pay to release partner wallet balance.',
        { variant: 'info' }
      );
      return;
    }
    const amountNgn = Math.round(Number(String(amount).replace(/,/g, '')) || 0);
    if (amountNgn <= 0) {
      showToast('Enter a positive withdrawal amount.', { variant: 'error' });
      return;
    }
    if (!treasuryAccountId) {
      showToast('Select a treasury account.', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/partner-wallets/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          partyKind: withdrawTarget.partyKind,
          partyId: withdrawTarget.partyId,
          partyName: withdrawTarget.partyName,
          amountNgn,
          treasuryAccountId: Number(treasuryAccountId),
          reference: reference.trim(),
          note: note.trim(),
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not withdraw partner wallet balance.', { variant: 'error' });
        return;
      }
      showToast(
        `Released ${formatNgn(amountNgn)} to ${withdrawTarget.partyName}. Remaining ${formatNgn(data.remainingBalanceNgn || 0)}.`
      );
      setWithdrawTarget(null);
      await ws.refresh?.();
      onWithdrawn?.(data);
    } finally {
      setBusy(false);
    }
  };

  if (!policyOn && balances.length === 0) return null;

  const policyHint =
    !policyOn && balances.length > 0
      ? 'Partner wallet policy is off — enable ZAREWA_PARTNER_WALLET_V1 to release balances.'
      : null;

  return (
    <>
      {policyHint ? (
        <p
          className="text-ui-xs text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-2"
          role="status"
        >
          {policyHint}
        </p>
      ) : null}
      <FinanceDeskColoredQueuePanel
        theme="violet"
        title="Staff / partner refund payouts"
        icon={<Wallet size={16} strokeWidth={2} />}
        count={balances.length}
        testId="finance-partner-wallets-awaiting"
        action={
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-ui-xs font-semibold text-violet-800 hover:underline"
          >
            {expanded ? 'Hide' : 'Show'}
          </button>
        }
      >
        {!expanded ? (
          <p className="text-ui-xs text-slate-500 px-1 py-2">
            {balances.length} staff/partner balance{balances.length === 1 ? '' : 's'} ready after BM approval
            (net of 20% company cut where applicable).
          </p>
        ) : balances.length === 0 ? (
          <p className="text-ui-xs text-slate-500 px-1 py-3 text-center">
            No staff/partner refund balances waiting. Approved customer refunds without wallet still appear under
            Refund payouts above.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {balances.map((row) => (
              <FinanceDeskColoredQueueRow
                key={`${row.partyKind}:${row.partyId}`}
                theme="violet"
                testId={`finance-partner-wallet-row-${row.partyId}`}
                title={
                  <>
                    <span className="font-semibold text-slate-800">{row.partyName}</span>
                    <span className="font-medium text-slate-500">
                      {' '}
                      · {row.openCreditCount} credit{row.openCreditCount === 1 ? '' : 's'}
                    </span>
                  </>
                }
                meta={[row.payeeBankName, row.payeeAccountNo].filter(Boolean).join(' · ') || 'No bank on file'}
                extra={
                  <p className="text-[11px] text-slate-500">
                    {row.payeeName || '—'} · staff allocation refund · withdraw net amount
                  </p>
                }
                amount={formatNgn(row.balanceNgn)}
                actions={
                  canPay && userMayPayCustomerRefund(ws) ? (
                    <FinanceDeskQueueActionButton tone="violet" onClick={() => void openWithdraw(row)}>
                      Withdraw
                    </FinanceDeskQueueActionButton>
                  ) : null
                }
              />
            ))}
          </ul>
        )}
      </FinanceDeskColoredQueuePanel>

      <ModalFrame isOpen={Boolean(withdrawTarget)} onClose={() => !busy && setWithdrawTarget(null)}>
        <div className="z-modal-panel max-w-lg max-h-[min(92vh,720px)] overflow-y-auto custom-scrollbar p-6 sm:p-8">
          <div className="flex items-start gap-2 mb-4">
            <Users className="text-violet-700 shrink-0 mt-0.5" size={22} />
            <div>
              <h3 className="text-xl font-bold text-zarewa-teal">Release staff / partner refund</h3>
              <p className="text-ui-xs text-slate-500 mt-1">
                BM already approved. Amount is net of any 20% company cut on staff allocations — no second
                approval.
              </p>
            </div>
          </div>
          {withdrawTarget ? (
            <form className="space-y-4" onSubmit={submitWithdraw}>
              <div className="rounded-xl border border-violet-100 bg-violet-50/80 p-3 text-sm space-y-1">
                <p className="font-bold text-slate-800">{withdrawTarget.partyName}</p>
                <p className="text-ui-xs text-slate-600">
                  {[withdrawTarget.payeeName, withdrawTarget.payeeBankName, withdrawTarget.payeeAccountNo]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="text-sm font-black text-violet-900 tabular-nums pt-1">
                  Open balance {formatNgn(withdrawTarget.balanceNgn)}
                </p>
              </div>
              {credits.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 max-h-36 overflow-y-auto space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Open credits (FIFO)</p>
                  {credits.map((c) => (
                    <p key={c.id} className="text-ui-xs text-slate-700 flex justify-between gap-2">
                      <span className="font-mono truncate">{c.refundId || c.id}</span>
                      <span className="tabular-nums font-semibold shrink-0">{formatNgn(c.openNgn)}</span>
                    </p>
                  ))}
                </div>
              ) : null}
              <div>
                <label className="text-ui-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Amount to release</label>
                <input
                  type="number"
                  min={1}
                  max={Math.round(Number(withdrawTarget.balanceNgn) || 0)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-bold"
                  required
                />
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    className="text-ui-xs font-semibold text-violet-700 hover:underline"
                    onClick={() => setAmount(String(Math.round(Number(withdrawTarget.balanceNgn) || 0)))}
                  >
                    Full balance
                  </button>
                </div>
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Pay from</label>
                <select
                  value={treasuryAccountId}
                  onChange={(e) => setTreasuryAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm bg-white"
                  required
                >
                  <option value="">Select treasury account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name || a.bankName || a.id}
                    </option>
                  ))}
                </select>
              </div>
              <input
                placeholder="Bank / transfer reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm"
              />
              <textarea
                placeholder="Note (optional)"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm"
              />
              <button type="submit" disabled={busy} className="z-btn-primary w-full justify-center py-3 disabled:opacity-60">
                <Banknote size={16} />
                {busy ? 'Posting…' : 'Release payment'}
              </button>
            </form>
          ) : null}
        </div>
      </ModalFrame>
    </>
  );
}

export default PartnerWalletCashierPanel;
