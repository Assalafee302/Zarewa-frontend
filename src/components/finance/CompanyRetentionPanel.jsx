import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Landmark, RefreshCw } from 'lucide-react';
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

function formatWhen(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10) || null;
  return d.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDay(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10) || '—';
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Company cut from staff refund allocations — accumulated balance, BM approve, cashier pay.
 * Credits are available as they settle; another withdrawal is allowed only after the
 * cooldown from the last *paid* withdrawal (not credit age).
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
      if (ok && data?.ok !== false) {
        setSummary(data);
        if (Math.round(Number(data?.backfilled) || 0) > 0) {
          showToast(`Loaded ${data.backfilled} company-cut balance(s) from approved refunds.`, {
            variant: 'success',
          });
        }
      } else showToast(String(data?.error || 'Could not load company cut balance.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load, ws?.session?.currentBranchId]);

  const total = Math.round(Number(summary?.totalOpenNgn) || 0);
  const available = Math.round(Number(summary?.availableNgn) || 0);
  const locked = Math.round(Number(summary?.heldNgn) || 0);
  const cooldownDays =
    Number(summary?.cooldownDays) || Number(summary?.holdDays) || 14;
  const cooldownActive = Boolean(summary?.cooldownActive);
  const nextAllowedLabel = formatWhen(summary?.nextWithdrawalAllowedAtIso);
  const lastPaidLabel = formatWhen(summary?.lastWithdrawalPaidAtIso);
  const pending = Array.isArray(summary?.pendingWithdrawals) ? summary.pendingWithdrawals : [];
  const credits = Array.isArray(summary?.credits) ? summary.credits : [];
  const hasPending = pending.length > 0;
  const canOpenRequest = canRequest && available > 0 && !cooldownActive && !hasPending;

  const openRequest = () => {
    if (!canOpenRequest) return;
    setAmount(String(available));
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

  const requestHint = cooldownActive
    ? nextAllowedLabel
      ? `Next withdrawal after ${nextAllowedLabel}`
      : `Next withdrawal ${cooldownDays} days after last payout`
    : hasPending
      ? 'Finish or reject the open withdrawal first'
      : available <= 0
        ? 'No available balance'
        : null;

  const panelDescription = `Staff refund % cuts land here immediately. Another withdrawal is allowed ${cooldownDays} days after the last paid one — Branch Manager approves, Finance pays.`;

  const body = (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total balance</p>
          <p className="text-sm font-black tabular-nums text-slate-900">{formatNgn(total)}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Withdraw now</p>
          <p className="text-sm font-black tabular-nums text-emerald-900">{formatNgn(available)}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
            {cooldownActive ? `Locked (${cooldownDays}d gap)` : 'Locked'}
          </p>
          <p className="text-sm font-black tabular-nums text-amber-950">{formatNgn(locked)}</p>
        </div>
      </div>

      {cooldownActive ? (
        <div className="flex gap-2.5 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 leading-relaxed">
          <Clock size={14} className="mt-0.5 shrink-0 text-amber-700" strokeWidth={2.25} />
          <div className="min-w-0 space-y-0.5">
            <p className="font-bold text-amber-950">Withdrawal cooldown active</p>
            <p>
              Balance stays on the ledger, but the next request opens{' '}
              <span className="font-semibold">{nextAllowedLabel || `in ${cooldownDays} days`}</span>
              {lastPaidLabel ? (
                <>
                  {' '}
                  · last paid <span className="font-semibold">{lastPaidLabel}</span>
                </>
              ) : null}
              .
            </p>
          </div>
        </div>
      ) : lastPaidLabel && total > 0 ? (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Last withdrawal paid <span className="font-semibold text-slate-700">{lastPaidLabel}</span>
          {' · '}
          next allowed after a {cooldownDays}-day gap.
        </p>
      ) : null}

      {summary && summary.tablesReady === false ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 leading-relaxed">
          Company retention ledger is not ready on this server. Restart the API so migrations run, then refresh.
        </div>
      ) : null}

      {summary &&
      summary.tablesReady !== false &&
      total <= 0 &&
      Math.round(Number(summary?.backfillScanned) || 0) > 0 &&
      Math.round(Number(summary?.backfilled) || 0) <= 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 leading-relaxed">
          Approved refunds with company cut were found but no ledger balance could be built. Contact support if
          Refresh does not load balances after an API restart.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <FinanceDeskQueueActionButton tone="slate" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </FinanceDeskQueueActionButton>
        {canRequest ? (
          <span className="inline-flex flex-col gap-0.5">
            <FinanceDeskQueueActionButton
              tone="teal"
              onClick={openRequest}
              disabled={!canOpenRequest}
              title={requestHint || 'Request company cut withdrawal'}
            >
              Request withdrawal
            </FinanceDeskQueueActionButton>
            {requestHint && !canOpenRequest ? (
              <span className="text-[10px] font-medium text-slate-500 max-w-[16rem] leading-snug">
                {requestHint}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {pending.length ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Withdrawal queue</p>
          <ul className="space-y-1.5">
            {pending.map((w) => (
              <FinanceDeskColoredQueueRow
                key={w.id}
                theme="violet"
                title={w.id}
                meta={`${w.status === 'pending_bm' ? 'Awaiting BM' : 'Approved · pay'} · ${w.requestedByName || '—'}${
                  w.payeeBankName ? ` · ${w.payeeBankName}` : ''
                }`}
                amount={formatNgn(w.amountNgn)}
                actions={
                  <>
                    {canApprove && w.status === 'pending_bm' ? (
                      <>
                        <FinanceDeskQueueActionButton tone="teal" onClick={() => void decide(w.id, 'approve')}>
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
          </ul>
        </div>
      ) : null}

      {credits.length ? (
        <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white/60">
          <table className="w-full text-ui-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Refund</th>
                <th className="px-2 py-1.5 text-left font-bold">Settled</th>
                <th className="px-2 py-1.5 text-right font-bold">Open</th>
                <th className="px-2 py-1.5 text-left font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {credits.slice(0, 40).map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono text-[11px]">{c.refundId || c.id}</td>
                  <td className="px-2 py-1.5 text-slate-600">{formatDay(c.createdAtIso)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-slate-900">
                    {formatNgn(c.openNgn)}
                  </td>
                  <td className="px-2 py-1.5">
                    {cooldownActive ? (
                      <span className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                        In cooldown
                      </span>
                    ) : (
                      <span className="inline-flex rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                        Ready
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-ui-xs text-slate-500">
          No company-cut balance yet. Cuts accrue when staff refund allocations are approved.
        </p>
      )}
    </div>
  );

  return (
    <>
      {embedded ? (
        body
      ) : (
        <FinanceDeskColoredQueuePanel
          theme="violet"
          title="Company cut retention"
          description={panelDescription}
          icon={<Landmark size={16} strokeWidth={2} />}
          testId="finance-company-retention"
          count={Math.max(pending.length, credits.length, total > 0 ? 1 : 0)}
        >
          {body}
        </FinanceDeskColoredQueuePanel>
      )}

      {requestOpen ? (
        <ModalFrame isOpen title="Request company cut withdrawal" onClose={() => !busy && setRequestOpen(false)}>
          <div className="z-modal-panel max-w-lg overflow-y-auto p-6">
            <h3 className="mb-1 text-lg font-bold text-zarewa-teal">Request company cut withdrawal</h3>
            <p className="mb-4 text-xs leading-relaxed text-slate-600">
              Up to {formatNgn(available)} is withdrawable now. After this payout, the next request waits{' '}
              {cooldownDays} days.
            </p>
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
            <h3 className="mb-1 text-lg font-bold text-zarewa-teal">Pay company cut withdrawal</h3>
            <p className="mb-3 text-xs text-slate-600 leading-relaxed">
              Paying starts the {cooldownDays}-day gap before another withdrawal can be requested.
            </p>
            <form className="space-y-3" onSubmit={submitPay}>
              <p className="text-sm font-semibold text-slate-800">{formatNgn(payTarget.amountNgn)}</p>
              {payTarget.payeeName ? (
                <p className="text-xs text-slate-600">
                  {payTarget.payeeName}
                  {payTarget.payeeBankName ? ` · ${payTarget.payeeBankName}` : ''}
                  {payTarget.payeeAccountNo ? ` · ${payTarget.payeeAccountNo}` : ''}
                </p>
              ) : null}
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
