import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, RefreshCw } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { ModalFrame } from '../layout';
import {
  FinanceDeskColoredQueuePanel,
  FinanceDeskColoredQueueRow,
  FinanceDeskQueueActionButton,
} from './FinanceDeskColoredQueuePanel';

/**
 * Company cut from staff refund allocations — accumulated balance, BM approve, cashier pay.
 */
export function CompanyRetentionPanel({
  treasuryAccounts = [],
  canPay = false,
  canApprove = false,
  canRequest = false,
  embedded = false,
}) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [amount, setAmount] = useState('');
  const [payeeName, setPayeeName] = useState('Zarewa Company');
  const [payeeBankName, setPayeeBankName] = useState('');
  const [payeeAccountNo, setPayeeAccountNo] = useState('');
  const [note, setNote] = useState('');
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [reference, setReference] = useState('');

  const accounts = useMemo(
    () => (Array.isArray(treasuryAccounts) ? treasuryAccounts : []),
    [treasuryAccounts]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiFetch('/api/refund-company-retention');
      if (ok && data?.ok !== false) setSummary(data);
      else showToast(String(data?.error || 'Could not load company cut balance.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load, ws?.session?.currentBranchId]);

  const openRequest = () => {
    setAmount(String(Math.round(Number(summary?.availableNgn) || 0)));
    setNote('');
    setRequestOpen(true);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/refund-company-retention/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          amountNgn: Math.round(Number(String(amount).replace(/,/g, '')) || 0),
          payeeName,
          payeeBankName,
          payeeAccountNo,
          note,
          branchId: ws?.session?.currentBranchId || ws?.workspaceBranchId,
        }),
      });
      if (!ok || !data?.ok) {
        showToast(String(data?.error || 'Could not request withdrawal.'), { variant: 'error' });
        return;
      }
      showToast('Withdrawal requested — awaiting Branch Manager approval.', { variant: 'success' });
      setRequestOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const decide = async (id, decision) => {
    if (busy) return;
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/refund-company-retention/withdrawals/${encodeURIComponent(id)}/decide`,
        { method: 'POST', body: JSON.stringify({ decision }) }
      );
      if (!ok || !data?.ok) {
        showToast(String(data?.error || `Could not ${decision}.`), { variant: 'error' });
        return;
      }
      showToast(decision === 'approve' ? 'Approved for cashier payout.' : 'Withdrawal rejected.', {
        variant: 'success',
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const submitPay = async (e) => {
    e.preventDefault();
    if (!payTarget || busy) return;
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/refund-company-retention/withdrawals/${encodeURIComponent(payTarget.id)}/pay`,
        {
          method: 'POST',
          body: JSON.stringify({
            treasuryAccountId,
            reference,
            note,
          }),
        }
      );
      if (!ok || !data?.ok) {
        showToast(String(data?.error || 'Payout failed.'), { variant: 'error' });
        return;
      }
      showToast('Company cut withdrawal paid from treasury.', { variant: 'success' });
      setPayTarget(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const total = Math.round(Number(summary?.totalOpenNgn) || 0);
  const available = Math.round(Number(summary?.availableNgn) || 0);
  const held = Math.round(Number(summary?.heldNgn) || 0);
  const holdDays = Number(summary?.holdDays) || 14;
  const pending = Array.isArray(summary?.pendingWithdrawals) ? summary.pendingWithdrawals : [];
  const credits = Array.isArray(summary?.credits) ? summary.credits : [];

  const body = (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase text-slate-500">Total balance</p>
          <p className="text-sm font-black tabular-nums text-slate-900">{formatNgn(total)}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase text-emerald-800">Available</p>
          <p className="text-sm font-black tabular-nums text-emerald-900">{formatNgn(available)}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase text-amber-800">In hold ({holdDays}d)</p>
          <p className="text-sm font-black tabular-nums text-amber-950">{formatNgn(held)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FinanceDeskQueueActionButton tone="slate" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </FinanceDeskQueueActionButton>
        {canRequest ? (
          <FinanceDeskQueueActionButton tone="teal" onClick={openRequest} disabled={available <= 0}>
            Request withdrawal
          </FinanceDeskQueueActionButton>
        ) : null}
      </div>

      {pending.length ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Withdrawal queue</p>
          {pending.map((w) => (
            <FinanceDeskColoredQueueRow
              key={w.id}
              title={w.id}
              subtitle={`${w.status === 'pending_bm' ? 'Awaiting BM' : 'Approved · pay'} · ${w.requestedByName || '—'}`}
              amount={formatNgn(w.amountNgn)}
              actions={
                <>
                  {canApprove && w.status === 'pending_bm' ? (
                    <>
                      <FinanceDeskQueueActionButton tone="emerald" onClick={() => void decide(w.id, 'approve')}>
                        Approve
                      </FinanceDeskQueueActionButton>
                      <FinanceDeskQueueActionButton tone="rose" onClick={() => void decide(w.id, 'reject')}>
                        Reject
                      </FinanceDeskQueueActionButton>
                    </>
                  ) : null}
                  {canPay && w.status === 'approved' ? (
                    <FinanceDeskQueueActionButton
                      tone="sky"
                      onClick={() => {
                        setPayTarget(w);
                        setTreasuryAccountId(accounts[0]?.id != null ? String(accounts[0].id) : '');
                        setReference('');
                        setNote('');
                      }}
                    >
                      Pay
                    </FinanceDeskQueueActionButton>
                  ) : null}
                </>
              }
            />
          ))}
        </div>
      ) : null}

      {credits.length ? (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full text-ui-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-1 text-left font-bold">Refund</th>
                <th className="px-2 py-1 text-right font-bold">Open</th>
                <th className="px-2 py-1 text-left font-bold">Available</th>
              </tr>
            </thead>
            <tbody>
              {credits.slice(0, 40).map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-2 py-1 font-mono">{c.refundId || c.id}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{formatNgn(c.openNgn)}</td>
                  <td className="px-2 py-1">
                    {c.available ? (
                      <span className="text-emerald-700">Now</span>
                    ) : (
                      <span className="text-amber-800">
                        {(c.availableAfterIso || '').slice(0, 10) || 'Held'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-ui-xs text-slate-500">No company-cut balance yet. Cuts accrue when staff refund allocations are approved.</p>
      )}
    </div>
  );

  return (
    <>
      {embedded ? (
        body
      ) : (
        <FinanceDeskColoredQueuePanel
          title="Company cut retention"
          subtitle={`Staff refund % cuts accumulate here. After ${holdDays} days, withdraw with Branch Manager approval.`}
          icon={Landmark}
          tone="violet"
          testId="finance-company-retention"
          count={pending.length || (total > 0 ? 1 : 0)}
        >
          {body}
        </FinanceDeskColoredQueuePanel>
      )}

      {requestOpen ? (
        <ModalFrame isOpen title="Request company cut withdrawal" onClose={() => !busy && setRequestOpen(false)}>
          <div className="z-modal-panel max-w-lg overflow-y-auto p-6">
            <h3 className="mb-3 text-lg font-bold text-zarewa-teal">Request company cut withdrawal</h3>
            <form className="space-y-3" onSubmit={submitRequest}>
              <label className="block text-ui-xs font-semibold text-slate-700">
                Amount (₦)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label className="block text-ui-xs font-semibold text-slate-700">
                Payee name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  required
                />
              </label>
              <label className="block text-ui-xs font-semibold text-slate-700">
                Bank
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={payeeBankName}
                  onChange={(e) => setPayeeBankName(e.target.value)}
                  required
                />
              </label>
              <label className="block text-ui-xs font-semibold text-slate-700">
                Account number
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={payeeAccountNo}
                  onChange={(e) => setPayeeAccountNo(e.target.value)}
                  required
                />
              </label>
              <label className="block text-ui-xs font-semibold text-slate-700">
                Note
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-zarewa-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Submit for BM approval
              </button>
            </form>
          </div>
        </ModalFrame>
      ) : null}

      {payTarget ? (
        <ModalFrame isOpen title={`Pay ${payTarget.id}`} onClose={() => !busy && setPayTarget(null)}>
          <div className="z-modal-panel max-w-lg overflow-y-auto p-6">
            <h3 className="mb-3 text-lg font-bold text-zarewa-teal">Pay company cut withdrawal</h3>
            <form className="space-y-3" onSubmit={submitPay}>
              <p className="text-sm font-semibold text-slate-800">{formatNgn(payTarget.amountNgn)}</p>
              <label className="block text-ui-xs font-semibold text-slate-700">
                Treasury account
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={treasuryAccountId}
                  onChange={(e) => setTreasuryAccountId(e.target.value)}
                  required
                >
                  <option value="">Select…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name || a.label || a.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-ui-xs font-semibold text-slate-700">
                Bank reference
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={busy || !canPay}
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Pay from treasury
              </button>
            </form>
          </div>
        </ModalFrame>
      ) : null}
    </>
  );
}

export default CompanyRetentionPanel;
