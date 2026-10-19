import React, { useMemo, useState } from 'react';
import { RefundableBalance } from '../../components/refund/RefundableBalance.jsx';
import { RefundPayoutModal } from '../../components/finance/RefundPayoutModal.jsx';
import { buildRefundRecordPrintHtml } from '../../lib/refundRecordPrint.js';
import { normalizeRefund } from '../../lib/refundsStore.js';
import { refundAboveRefundableMessage } from '../../shared/lib/refundQuotationMoney.js';
import { formatNgn } from '../../Data/mockData';

/**
 * DEV-only gallery (/preview/refunds): the refund screens on fixture data, before (reconstructed old text)
 * and after (live components). Sample records only — no API, no workspace. Excluded from the production build
 * (App.jsx mounts it only when import.meta.env.DEV).
 */

/* RF-KD-26-9769 Yunusa Driver (restored copy, 14 Oct 2026): overpayment 902,940 split 730,000 customer / 172,940 staff. */
const YUNUSA = normalizeRefund({
  refundID: 'RF-KD-26-9769',
  customer: 'Yunusa Driver',
  customerID: 'CUS-KD-26-1118',
  quotationRef: 'QT-KD-26-1747',
  reasonCategory: ['Overpayment'],
  reason: 'Overpayment',
  amountNgn: 902_940,
  approvedAmountNgn: 902_940,
  paidAmountNgn: 730_000,
  status: 'Partially paid',
  requestedBy: 'Abdulrahman Uthman Sali',
  requestedAtISO: '2026-10-10T14:37:00.871Z',
  approvalDate: '2026-10-10',
  approvedBy: 'Abdulrahman Uthman Sali',
  paidBy: 'Mansur Lawal Matazu',
  paidAtISO: '2026-10-10T12:00:00.000Z',
  payeeName: 'Babangida',
  payeeBankName: 'gt bank',
  payeeAccountNo: '0251820148',
  paymentNote: 'Settled at approval: company cut ₦34,588 → retention ledger.',
  calculationLines: [{ label: 'Overpayment on QT-KD-26-1747', amountNgn: 902_940, category: 'Overpayment' }],
  splitDistributions: [
    {
      recipientKind: 'customer',
      recipientCustomerID: 'CUS-KD-26-1118',
      amountNgn: 730_000,
      companyDeductionNgn: 0,
      netPayoutNgn: 730_000,
      deductionRate: 0,
      note: 'Overpayment · quote customer',
      payoutAccount: { payeeName: 'Babangida', payeeBankName: 'gt bank', payeeAccountNo: '0251820148', partyKind: 'customer', partyId: 'CUS-KD-26-1118', partyName: 'yunusa driver' },
    },
    {
      recipientKind: 'customer',
      recipientCustomerID: 'CUS-KD-26-0953',
      amountNgn: 172_940,
      companyDeductionNgn: 34_588,
      netPayoutNgn: 138_352,
      deductionRate: 0.2,
      forceClaimingStaffCut: true,
      staffBankAccountMatch: true,
      note: 'Quotation sales staff · Abdulrahman Uthman Sali',
      payoutAccount: { payeeName: 'Abdulrahman Uthman Sali', payeeBankName: 'opay', payeeAccountNo: '8031831486', partyKind: 'customer', partyId: 'CUS-KD-26-0953', partyName: 'Abdulrahman Uthman Sali · ZAPKD005 (Staff)' },
    },
  ],
  payoutHistory: [
    { id: 'TM-KD-26-3202', postedAtISO: '2026-10-10T12:00:00.000Z', treasuryAccountId: 4, accountName: 'Zarewa Aluminum & Plastics Ltd (Moniepoint)', amountNgn: 730_000, reference: 'TRF 10 Oct', note: '' },
  ],
  settlementSummary: {
    approvedNgn: 902_940,
    companyCutNgn: 34_588,
    netCashDueNgn: 868_352,
    treasuryPaidNgn: 730_000,
    walletWithdrawnNgn: 0,
    creditAppliedNgn: 0,
    cashPaidNgn: 730_000,
    payeeSettledNgn: 730_000,
    cashOutstandingNgn: 138_352,
    tillPayableNgn: 138_352,
    heldUnclearedNgn: 0,
    walletOpenNgn: 0,
    publicLabel: 'Partially settled',
    status: 'Partially paid',
    payoutBlockers: [],
    nextActions: [{ code: 'pay_till', label: 'Pay till/bank', amountNgn: 138_352 }],
    cashierPayoutLines: [
      { payeeName: 'Babangida', payeeBankName: 'gt bank', payeeAccountNo: '0251820148', staffShare: false, roleLabel: 'Customer share', grossNgn: 730_000, companyDeductionNgn: 0, netNgn: 730_000, paidToPayeeNgn: 730_000, tillDueNgn: 0 },
      { payeeName: 'Abdulrahman Uthman Sali', payeeBankName: 'opay', payeeAccountNo: '8031831486', staffShare: true, roleLabel: 'Staff share', grossNgn: 172_940, companyDeductionNgn: 34_588, netNgn: 138_352, paidToPayeeNgn: 0, tillDueNgn: 138_352 },
    ],
  },
});

/* QT-KD-26-1777 Gabdo: cash 12,000,000; RF-9776 1,913,200 on file; 29,200 moved to QT-1782 as credit. */
const GABDO = { cashInNgn: 12_000_000, refundsNgn: 1_913_200, creditOutNgn: 29_200 };

function Panel({ title, note, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <header>
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">{title}</h2>
        {note ? <p className="text-xs text-slate-500 mt-0.5">{note}</p> : null}
      </header>
      {children}
    </section>
  );
}

function BeforeAfter({ before, after, id, stack = false }) {
  return (
    <div className={stack ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'} id={id}>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Before (reconstructed)</p>
        {before}
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-2">After</p>
        {after}
      </div>
    </div>
  );
}

export default function RefundGallery() {
  const [payLines, setPayLines] = useState([{ id: 'l1', treasuryAccountId: 4, amount: 138_352, reference: '', dateISO: '2026-10-19' }]);
  const [note, setNote] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const voucherHtml = useMemo(() => buildRefundRecordPrintHtml(YUNUSA, formatNgn), []);
  const oldRefusal = 'Refundable balance on this quotation is fully covered by existing refund requests.';
  const newRefusal = refundAboveRefundableMessage({ requestedNgn: 160_000, cashInNgn: 2_100_000, refundsNgn: 1_913_200, creditOutNgn: 29_200 });

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 space-y-6 text-slate-900">
      <header>
        <h1 className="text-xl font-black">Refund screens — fixture preview (dev only)</h1>
        <p className="text-sm text-slate-600">
          Kaduna figures from the restored copy of 14 Oct 2026. RF-KD-26-9769 Yunusa Driver (overpayment ₦902,940: ₦730,000 to the customer,
          ₦172,940 staff share with the 20% cut) and QT-KD-26-1777 Gabdo (₦12,000,000 cash, ₦1,913,200 refunded, ₦29,200 credit moved).
        </p>
      </header>

      <Panel title="1 · Refund form — refundable on this quotation" note="Sales form hero cell (create mode). The old cell showed the sum of the preview lines as “Remaining”.">
        <BeforeAfter
          id="form-refundable"
          before={
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Requested Amount</span>
              <p className="font-mono text-lg font-black tabular-nums">₦150,000</p>
              <p className="text-ui-xs text-amber-700 font-semibold tabular-nums">Remaining: ₦150,000</p>
            </div>
          }
          after={
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Requested Amount</span>
              <p className="font-mono text-lg font-black tabular-nums">₦150,000</p>
              <RefundableBalance compact breakdown={GABDO} suggestedNgn={150_000} requestedNgn={150_000} />
            </div>
          }
        />
      </Panel>

      <Panel title="2 · Refusal messages say the rule and the numbers" note="Create / approve above the balance.">
        <BeforeAfter
          id="form-refusal"
          before={<p className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-900">{oldRefusal}</p>}
          after={<p className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-900">{newRefusal}</p>}
        />
      </Panel>

      <Panel title="3 · Live preview while typing (form footer)" note="Customer share, staff share, 20% cut, net, refundable left — updates as the split rows change.">
        <BeforeAfter
          id="form-live"
          before={
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-600 border border-slate-200/80">
              <span>Refund: <strong>₦902,940</strong></span>
              <span className="text-slate-300">|</span>
              <span>Payout: <strong>₦868,352</strong></span>
              <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 text-[10px]">Balanced</span>
            </div>
          }
          after={
            <div className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-600 border border-slate-200/80">
              <span>Refund: <strong>₦902,940</strong></span>
              <span className="text-slate-300">|</span>
              <span>Customer: <strong>₦730,000</strong></span>
              <span>Staff: <strong>₦138,352</strong></span>
              <span>Cut: <strong className="text-rose-700">−₦34,588</strong></span>
              <span className="text-slate-300">|</span>
              <span>Net to pay: <strong>₦868,352</strong></span>
              <span className="text-slate-300">|</span>
              <span>Refundable left: <strong>₦0</strong></span>
              <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 text-[10px]">Balanced</span>
            </div>
          }
        />
      </Panel>

      <Panel title="4 · Cashier pay dialog — Remaining to pay" note="RF-KD-26-9769 after the customer's ₦730,000 was paid; the staff share is still due.">
        <BeforeAfter
          id="cashier-remaining"
          before={
            <div className="space-y-1">
              <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Payee Cash Due</span>
              <p className="text-2xl font-black text-rose-700 font-mono">₦138,352</p>
              <p className="text-xs text-slate-500">From company till or bank</p>
            </div>
          }
          after={
            <div className="space-y-1">
              <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Payee Cash Due</span>
              <p className="text-2xl font-black text-rose-700 font-mono">₦138,352</p>
              <p className="text-xs text-slate-500">From company till or bank</p>
              <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs">
                <div className="flex items-baseline justify-between"><span className="font-bold uppercase text-slate-500">Remaining to pay</span><span className="text-slate-500">Hide</span></div>
                <span className="font-mono text-lg font-black">₦138,352</span>
                <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 tabular-nums text-slate-600">
                  <dt>Approved</dt><dd className="text-right font-semibold">₦902,940</dd>
                  <dt>− company cut (retained, never paid to the payee)</dt><dd className="text-right font-semibold">₦34,588</dd>
                  <dt>− paid so far from till / bank / wallet</dt><dd className="text-right font-semibold">₦730,000</dd>
                  <dt className="border-t border-slate-200 pt-0.5 font-bold">= remaining to pay</dt><dd className="border-t border-slate-200 pt-0.5 text-right font-bold">₦138,352</dd>
                </dl>
              </div>
            </div>
          }
        />
        <div className="rounded-xl border border-slate-200 bg-white p-2" id="cashier-modal">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Live dialog (after)</p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
            id="open-cashier-dialog"
          >
            Open the cashier pay dialog
          </button>
          <RefundPayoutModal
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            refund={YUNUSA}
            selectedPayeeKey={null}
            refundPayLines={payLines}
            onUpdatePayLine={(id, patch) => setPayLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))}
            onAddPayLine={() => setPayLines((ls) => [...ls, { id: `l${ls.length + 1}`, treasuryAccountId: 4, amount: 0, reference: '', dateISO: '2026-10-19' }])}
            onRemovePayLine={(id) => setPayLines((ls) => ls.filter((l) => l.id !== id))}
            paymentNote={note}
            onPaymentNoteChange={setNote}
            bankAccountsSelectOrder={[{ id: 4, name: 'Zarewa Aluminum & Plastics Ltd', bank_name: 'Moniepoint', type: 'Bank' }, { id: 2, name: 'Taj Bank', bank_name: 'Taj', type: 'Bank' }]}
            treasuryBookDisplayNgn={() => 10_059_864}
            treasuryAccountDisplayName={(a) => a?.name || 'Account'}
            activeActorLabel="Mansur Lawal Matazu"
            onConfirmPay={() => {}}
          />
        </div>
      </Panel>

      <Panel title="5 · Refund voucher (A5)" note="Payouts made (part n of m, date, account), balance left, approvals, split with the cut.">
        <BeforeAfter
          id="voucher"
          stack
          before={
            <div className="text-xs font-mono space-y-0.5">
              <div>Amount requested ₦902,940</div>
              <div>Approved (10/10/2026) · Abdulrahman Uthman Sali ₦902,940</div>
              <div>Company deduction (20% retained) −₦34,588</div>
              <div>Paid · Mansur Lawal Matazu · 10/10/2026 13:00 ₦730,000</div>
              <div className="font-bold">Till due now ₦138,352</div>
            </div>
          }
          after={<iframe title="Refund voucher" srcDoc={voucherHtml} className="w-full h-[760px] rounded-lg border border-slate-200 bg-white" />}
        />
      </Panel>
    </div>
  );
}
