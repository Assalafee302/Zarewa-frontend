import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { apiFetch } from '../../lib/apiBase';
import { payoutAccountProblem, treasuryAccountIsCashOffice } from '../../shared/lib/payoutAccountGuard.js';
import {
  FinanceDeskColoredQueuePanel,
  FinanceDeskColoredQueueRow,
  FinanceDeskQueueActionButton,
} from './FinanceDeskColoredQueuePanel';

function weekLabel(weekKey) {
  const m = String(weekKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}` : weekKey;
}

/**
 * Finance Phase A (A7): refund staff shares under the threshold, one payout per staff member per week.
 * `data` = GET /api/staff-share-batches.
 */
export function StaffShareBatchPanel({ data, treasuryAccounts = [], onPaid, onAddPayoutAccount, showToast }) {
  const [payingKey, setPayingKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [voucher, setVoucher] = useState('');
  const [busy, setBusy] = useState(false);
  const batches = Array.isArray(data?.batches) ? data.batches : [];
  if (!batches.length) return null;
  // D2: paying from the Cash Office needs a voucher reference (the recipient is the staff member).
  const fromCash = treasuryAccountIsCashOffice(treasuryAccounts.find((a) => String(a.id) === String(accountId))?.type);

  const pay = async (batch) => {
    if (!accountId || busy || (fromCash && voucher.trim().length < 3)) return;
    setBusy(true);
    try {
      const { ok, data: res } = await apiFetch('/api/staff-share-batches/pay', {
        method: 'POST',
        body: JSON.stringify({
          partyKind: batch.partyKind,
          partyId: batch.partyId,
          treasuryAccountId: Number(accountId),
          ...(fromCash ? { cashRecipientName: batch.partyName, voucherReference: voucher.trim() } : {}),
        }),
      });
      if (!ok || !res?.ok) {
        showToast?.(res?.error || 'Could not pay the staff-share batch.', { variant: 'error' });
        if (res?.paid?.length) onPaid?.(res);
        return;
      }
      showToast?.(`${batch.partyName}: ${formatNgn(res.totalNgn)} paid as one weekly batch (${res.payoutId}).`, {
        variant: 'success',
      });
      setPayingKey('');
      onPaid?.(res);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FinanceDeskColoredQueuePanel
      theme="amber"
      title={`Staff-share batch · week of ${weekLabel(data.weekKey)}`}
      icon={<Users size={16} strokeWidth={2} />}
      count={batches.length}
      testId="finance-staff-share-batch"
    >
      <p className="px-0.5 pb-1 text-ui-xs text-slate-500">
        Refund staff shares under {formatNgn(data.thresholdNgn)} are paid once a week per staff member.
      </p>
      <ul className="space-y-1.5">
        {batches.map((b) => {
          const accountProblem = payoutAccountProblem({ bankName: b.payeeBankName, accountNo: b.payeeAccountNo });
          const refunds = b.readyLines.map((l) => l.refundId).join(', ');
          return (
            <FinanceDeskColoredQueueRow
              key={b.key}
              theme="amber"
              testId={`finance-staff-share-batch-row-${b.partyId}`}
              title={
                <>
                  <span className="font-medium text-slate-700">{b.partyName}</span>
                  <span className="text-ui-xs font-bold uppercase text-slate-400"> · Staff</span>
                  {b.paidThisWeek ? (
                    <span className="ml-1 inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-ui-xs font-bold text-teal-900">
                      Paid this week
                    </span>
                  ) : null}
                </>
              }
              meta={[
                b.readyLines.length ? `${b.readyLines.length} share${b.readyLines.length === 1 ? '' : 's'}: ${refunds}` : null,
                b.waitingNgn > 0 ? `${formatNgn(b.waitingNgn)} waiting for the customer payout` : null,
                b.payeeAccountNo ? `Pay to ${b.payeeAccountNo}${b.payeeBankName ? ` (${b.payeeBankName})` : ''}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              amountLabel={b.readyNgn > 0 ? 'Batch total' : ''}
              amount={formatNgn(b.readyNgn)}
              actions={
                b.paidThisWeek || b.readyNgn <= 0 ? null : accountProblem && payingKey !== b.key ? (
                  <span className="flex items-center gap-1">
                  <FinanceDeskQueueActionButton tone="violet" title={accountProblem} onClick={() => onAddPayoutAccount?.(b)}>
                    Add payout account
                  </FinanceDeskQueueActionButton>
                  <FinanceDeskQueueActionButton tone="teal" title="No bank account — pay from the Cash Office with a voucher." onClick={() => setPayingKey(b.key)}>
                    Pay cash
                  </FinanceDeskQueueActionButton>
                  </span>
                ) : payingKey === b.key ? (
                  <span className="flex items-center gap-1">
                    <select
                      className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      aria-label="Pay from"
                    >
                      <option value="">Pay from…</option>
                      {treasuryAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    {fromCash ? (
                      <input
                        className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
                        value={voucher}
                        onChange={(e) => setVoucher(e.target.value)}
                        placeholder="Voucher ref"
                        aria-label="Voucher reference"
                      />
                    ) : null}
                    <FinanceDeskQueueActionButton
                      tone="primary"
                      disabled={!accountId || busy || (fromCash && voucher.trim().length < 3)}
                      onClick={() => void pay(b)}
                    >
                      {busy ? 'Paying…' : `Pay ${formatNgn(b.readyNgn)}`}
                    </FinanceDeskQueueActionButton>
                  </span>
                ) : (
                  <FinanceDeskQueueActionButton tone="violet" onClick={() => setPayingKey(b.key)}>
                    Pay batch
                  </FinanceDeskQueueActionButton>
                )
              }
            />
          );
        })}
      </ul>
    </FinanceDeskColoredQueuePanel>
  );
}
