import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  Copy,
  Info,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { ModalFrame, ModalScrollShell, ModalScrollHeader, ModalScrollBody, ModalScrollFooter } from '../layout';
import { formatNgn } from '../../Data/mockData';
import { refundIsOnPayoutHold, refundPayoutHoldReason } from '../../lib/refundsStore';
import {
  refundCashierMoneyStory,
  refundPayeePayoutQueueLines,
} from '../../lib/refundCashierDetail';
import { RefundFundBalanceStrip } from './RefundFundBalanceStrip.jsx';
import { RefundPayoutSituationPanel } from './RefundPayoutSituationPanel.jsx';

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label}`}
      className="inline-flex items-center gap-1 text-ui-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
    >
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

export function RefundPayoutModal({
  isOpen,
  onClose,
  refund,
  selectedPayeeKey = null,
  refundPayLines = [],
  onUpdatePayLine,
  onAddPayLine,
  onRemovePayLine,
  paymentNote = '',
  onPaymentNoteChange,
  releasePartnerWallet = true,
  onReleasePartnerWalletChange,
  bankAccountsSelectOrder = [],
  treasuryBookDisplayNgn = () => 0,
  treasuryAccountDisplayName = (a) => a?.name || 'Account',
  activeActorLabel = 'Staff',
  userMayPayCustomerRefund = true,
  overrideUnclearedPayoutHold = false,
  isSubmitting = false,
  onConfirmPay,
  onLiftHold,
  userMaySetRefundPayoutHold = false,
}) {
  const [activeTab, setActiveTab] = useState('payment'); // 'payment' | 'breakdown'

  const rid = String(refund?.refundID || '').trim();
  const qref = String(refund?.quotationRef || refund?.quotation_ref || '').trim();
  const customerName = String(refund?.customer || refund?.customerName || '').trim();
  const customerID = String(refund?.customerID || '').trim();

  const story = useMemo(() => refundCashierMoneyStory(refund), [refund]);

  const selectedPayee = useMemo(() => {
    if (!refund) return null;
    const lines = refundPayeePayoutQueueLines(refund);
    if (selectedPayeeKey) {
      return lines.find((line) => line.queueKey === selectedPayeeKey) ?? null;
    }
    return lines.length === 1 ? lines[0] : null;
  }, [refund, selectedPayeeKey]);

  const totalDisbursingNgn = useMemo(
    () => refundPayLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [refundPayLines]
  );

  const payeeName =
    selectedPayee?.recipientLabel ||
    selectedPayee?.payeeName ||
    refund?.payeeName ||
    customerName ||
    'Customer';

  const bankName = selectedPayee?.payeeBankName || refund?.payeeBankName || '';
  const accountNo = selectedPayee?.payeeAccountNo || refund?.payeeAccountNo || '';
  const recipientKind = selectedPayee?.recipientKind || 'customer';

  const isOnHold = refundIsOnPayoutHold(refund);
  const holdReason = refundPayoutHoldReason(refund);

  const heldUnclearedNgn = Math.round(Number(story.unclearedHoldNgn) || 0);
  const readyUnclearedNgn = Math.max(0, Math.round(Number(story.tillPayableNgn ?? story.cashDueNgn) || 0));
  const hasUnclearedHold =
    Boolean(selectedPayee?.payoutHeldForUnclearedReceipts) || heldUnclearedNgn > 0;

  const unclearedReceiptIds = useMemo(() => {
    const list =
      refund?.settlementSummary?.unclearedReceiptIds ||
      selectedPayee?.unclearedReceiptIds ||
      [];
    return Array.isArray(list) ? list : [];
  }, [refund, selectedPayee]);

  const payoutBlockers = useMemo(() => {
    const blockers = refund?.settlementSummary?.payoutBlockers;
    return Array.isArray(blockers) ? blockers : [];
  }, [refund]);

  const walletOpenNgn = Math.round(Number(refund?.walletOpenNgn) || 0);
  const walletCredits = useMemo(
    () => (Array.isArray(refund?.walletOpenCredits) ? refund.walletOpenCredits : []),
    [refund]
  );

  const hasAppliedCredit = Math.round(Number(refund?.creditAppliedNgn) || 0) > 0 || story.appliedNgn > 0;
  const remainingAfterPost = Math.max(0, (Number(story.cashDueNgn) || 0) - totalDisbursingNgn);

  const noteTooShortForOverride =
    overrideUnclearedPayoutHold &&
    hasUnclearedHold &&
    paymentNote.replace(/\s+/g, ' ').trim().length < 10;

  if (!refund) return null;

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} title={`Refund Payout ${rid}`} surface="plain" showCloseButton={false}>
      <ModalScrollShell size="lg">
        {/* Header */}
        <ModalScrollHeader className="bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-600 shadow-xs">
                <RotateCcw size={20} aria-hidden />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Refund Payout</h2>
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
                    {rid}
                    <CopyButton text={rid} label="Refund ID" />
                  </span>
                  {qref ? (
                    <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-ui-xs font-semibold text-slate-500">
                      {qref}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs font-medium text-slate-500 truncate max-w-md">
                  {customerName}
                  {customerID ? <span className="ml-1 text-slate-400 font-mono">({customerID})</span> : null}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close refund pay dialog"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-40"
            >
              <X size={20} />
            </button>
          </div>
        </ModalScrollHeader>

        <ModalScrollBody className="space-y-4">
          {/* Gate 1: Administrative Hold Alert */}
          {isOnHold ? (
            <div className="rounded-xl border border-red-200 bg-red-50/95 p-3.5 flex items-start justify-between gap-3 text-red-950">
              <div className="flex items-start gap-2.5">
                <ShieldAlert size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">Administrative Hold Active</p>
                  <p className="text-sm font-semibold text-red-900 mt-0.5">
                    {holdReason || 'This refund payout is currently on hold.'}
                  </p>
                  <p className="text-xs text-red-800/80 mt-1">
                    {userMaySetRefundPayoutHold
                      ? 'You have permission to lift this hold and allow release.'
                      : 'A branch manager or authorized officer must lift this hold before payment.'}
                  </p>
                </div>
              </div>
              {userMaySetRefundPayoutHold && onLiftHold ? (
                <button
                  type="button"
                  onClick={onLiftHold}
                  disabled={isSubmitting}
                  className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 shadow-xs hover:bg-red-50 transition"
                >
                  Lift hold
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Gate 2: Unconfirmed Receipts Hold Banner */}
          {hasUnclearedHold ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/95 p-3.5 space-y-2 text-amber-950">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                      Receipt Confirmation Pending
                    </p>
                    {heldUnclearedNgn > 0 ? (
                      <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
                        {formatNgn(heldUnclearedNgn)} held
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                    {overrideUnclearedPayoutHold
                      ? 'This quotation still has unconfirmed receipts. You may release the held portion with an audited payment note (min. 10 characters).'
                      : readyUnclearedNgn > 0 && heldUnclearedNgn > 0
                        ? `${formatNgn(heldUnclearedNgn)} is held until quotation receipts are confirmed; ${formatNgn(readyUnclearedNgn)} is ready to release now.`
                        : 'Till payout is held until quotation receipts are confirmed.'}
                  </p>
                  {unclearedReceiptIds.length > 0 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-amber-800/80 font-medium">Pending receipt confirmation:</span>
                      {unclearedReceiptIds.map((id) => (
                        <span
                          key={id}
                          className="rounded-md border border-amber-300/80 bg-white px-2 py-0.5 font-mono text-ui-xs font-bold text-amber-900 shadow-2xs"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {payoutBlockers.map((b) => (
                    <p key={b.code} className="text-ui-xs text-amber-800 mt-1">
                      {b.action || b.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Hero Section: Amount & Payee */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-rose-50/30 p-4 sm:p-5 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Left: Net Cash Due */}
              <div className="space-y-1">
                <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                  {selectedPayee ? 'Payee Cash Due' : 'Approved Net Payout'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight font-mono">
                    {formatNgn(totalDisbursingNgn)}
                  </span>
                  {selectedPayee && selectedPayee.amountDueNgn < selectedPayee.netPayoutNgn ? (
                    <span className="text-xs font-semibold text-slate-500">
                      of {formatNgn(selectedPayee.netPayoutNgn)} net
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-500">
                  <span>From company till or bank</span>
                  {hasAppliedCredit ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('breakdown')}
                      className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-800 font-semibold underline underline-offset-2"
                    >
                      View applied credit ({formatNgn(story.appliedNgn)})
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Right: Recipient Card */}
              <div className="rounded-xl border border-sky-200/80 bg-white/90 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ui-xs font-bold uppercase tracking-wider text-sky-900/80 flex items-center gap-1.5">
                    {recipientKind === 'associated_staff' ? <User size={13} /> : <Building2 size={13} />}
                    Pay To
                  </span>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-ui-xs font-bold uppercase tracking-wide text-sky-800">
                    {recipientKind === 'associated_staff' ? 'Staff' : 'Beneficiary'}
                  </span>
                </div>
                <p className="mt-1 font-bold text-slate-900 text-sm truncate" title={payeeName}>
                  {payeeName}
                </p>
                {accountNo || bankName ? (
                  <div className="mt-1 flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                    <span className="font-mono font-semibold text-slate-700 tabular-nums">
                      {bankName ? `${bankName} · ` : ''}
                      {accountNo || '—'}
                    </span>
                    {accountNo ? <CopyButton text={accountNo} label="Account number" /> : null}
                  </div>
                ) : (
                  <p className="mt-1 text-ui-xs text-amber-700 italic">No bank details recorded (cash payout)</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex rounded-xl bg-slate-100/90 p-1 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('payment')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                activeTab === 'payment'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Disbursement</span>
              <span className="rounded-md bg-slate-200 px-1.5 py-0.2 text-ui-xs font-mono font-bold text-slate-700">
                {refundPayLines.length} line{refundPayLines.length === 1 ? '' : 's'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('breakdown')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                activeTab === 'breakdown'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Settlement & Breakdown</span>
              {hasAppliedCredit ? (
                <span className="rounded-md bg-amber-100 px-1.5 py-0.2 text-ui-xs font-bold text-amber-800">
                  Credit applied
                </span>
              ) : null}
            </button>
          </div>

          {/* TAB 1: Payment Execution */}
          <div className={activeTab === 'payment' ? 'space-y-4' : 'hidden'}>
            <form onSubmit={onConfirmPay} className="space-y-4">
              {/* Treasury lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Disbursement Treasury Account
                  </label>
                  <button
                    type="button"
                    onClick={onAddPayLine}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 border border-rose-200/80 rounded-lg px-2.5 py-1 transition"
                  >
                    <Plus size={13} /> Add split line
                  </button>
                </div>

                <div className="space-y-2">
                  {refundPayLines.map((line, idx) => (
                    <div
                      key={line.id}
                      className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={line.treasuryAccountId}
                          onChange={(e) => onUpdatePayLine(line.id, { treasuryAccountId: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        >
                          <option value="">Select treasury account…</option>
                          {bankAccountsSelectOrder.map((a) => (
                            <option key={a.id} value={String(a.id)}>
                              {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a))})
                            </option>
                          ))}
                        </select>
                        {refundPayLines.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => onRemovePayLine(line.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Remove split line"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-4">
                          <label className="block text-ui-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                            Date
                          </label>
                          <input
                            type="date"
                            value={line.dateISO}
                            onChange={(e) => onUpdatePayLine(line.id, { dateISO: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-ui-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                            Amount (₦)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={line.amount}
                            onChange={(e) => onUpdatePayLine(line.id, { amount: e.target.value })}
                            placeholder="0"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-700 font-mono outline-none focus:ring-2 focus:ring-rose-500/20"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-ui-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                            Reference
                          </label>
                          <input
                            type="text"
                            value={line.reference}
                            onChange={(e) => onUpdatePayLine(line.id, { reference: e.target.value })}
                            placeholder="Teller / transfer ref"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partner Wallet Release option (if applicable) */}
              {walletOpenNgn > 0 ? (
                <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-3.5 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded text-violet-600 focus:ring-violet-500/30"
                      checked={releasePartnerWallet}
                      onChange={(e) => onReleasePartnerWalletChange(e.target.checked)}
                    />
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <Wallet size={14} className="text-violet-700" />
                        <span className="font-bold text-violet-950">
                          Release partner wallet: {formatNgn(walletOpenNgn)}
                        </span>
                      </div>
                      <p className="text-violet-900/80 mt-0.5 leading-relaxed">
                        Staff / partner share for this refund — disbursed from the same treasury account without a second approval.
                      </p>
                    </div>
                  </label>
                  {walletCredits.length > 0 ? (
                    <ul className="space-y-1 text-ui-xs text-violet-950/90 pl-6 border-t border-violet-200/50 pt-2">
                      {walletCredits.map((c) => (
                        <li key={c.id || `${c.partyId}-${c.openNgn}`} className="flex justify-between items-center">
                          <span>{c.payeeName || c.partyName || c.partyId}</span>
                          <span className="font-mono font-bold">{formatNgn(c.openNgn)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {/* Payment Note */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Payment Note {overrideUnclearedPayoutHold && hasUnclearedHold ? '(Required for override)' : '(Optional)'}
                  </label>
                  {noteTooShortForOverride ? (
                    <span className="text-ui-xs font-semibold text-amber-700">Min. 10 chars required</span>
                  ) : null}
                </div>
                <input
                  value={paymentNote}
                  onChange={(e) => onPaymentNoteChange(e.target.value)}
                  placeholder="e.g. Cash 300,000 and TAJ Bank transfer 200,000"
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-medium outline-none transition ${
                    noteTooShortForOverride
                      ? 'border-amber-300 bg-amber-50/50 focus:ring-2 focus:ring-amber-500/20'
                      : 'border-slate-200 bg-white focus:ring-2 focus:ring-rose-500/20'
                  }`}
                />
              </div>

              {/* Summary Bar */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500 uppercase text-ui-xs">This Payout</span>
                  <span className="font-black font-mono text-slate-900">{formatNgn(totalDisbursingNgn)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500 uppercase text-ui-xs">Remaining Balance</span>
                  <span className="font-bold font-mono text-slate-700">{formatNgn(remainingAfterPost)}</span>
                </div>
                <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-ui-xs text-slate-400">
                  <span>Disbursing as: <strong className="text-slate-600 font-semibold">{activeActorLabel}</strong></span>
                  <span>Splits settled at approval</span>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isSubmitting || !userMayPayCustomerRefund || isOnHold}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-zarewa-teal py-3 text-sm font-bold text-white shadow-sm hover:bg-zarewa-teal/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  'Releasing…'
                ) : (
                  <>
                    <Check size={16} />
                    {walletOpenNgn > 0 && totalDisbursingNgn <= 0
                      ? 'Release Wallet'
                      : walletOpenNgn > 0
                        ? `Release Refund (${formatNgn(totalDisbursingNgn)})`
                        : `Pay Refund (${formatNgn(totalDisbursingNgn)})`}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* TAB 2: Settlement Breakdown & Audit Details */}
          <div className={activeTab === 'breakdown' ? 'space-y-4' : 'hidden'}>
            {/* Fund Balance Strip if credit applied */}
            {hasAppliedCredit ? (
              <RefundFundBalanceStrip
                amountNgn={refund.amountNgn}
                creditAppliedNgn={refund.creditAppliedNgn || story.appliedNgn}
                paidAmountNgn={refund.paidAmountNgn || story.paidNgn}
                creditAppliedToQuotationRef={refund.creditAppliedToQuotationRef || story.appliedToQuote}
                leftoverHint="payout"
              />
            ) : null}

            {/* Situation Panel */}
            <RefundPayoutSituationPanel refund={refund} />

            {/* Financial Story Breakdown */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <p className="text-ui-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Settlement & Entitlement Story
              </p>
              <div className="space-y-1.5 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Original Requested Amount</span>
                  <span className="font-bold font-mono text-slate-900">{formatNgn(story.requestedNgn)}</span>
                </div>
                {story.appliedNgn > 0 ? (
                  <div className="flex justify-between py-1 text-amber-900">
                    <span>Applied to {story.appliedToQuote || 'another quotation'}</span>
                    <span className="font-bold font-mono">-{formatNgn(story.appliedNgn)}</span>
                  </div>
                ) : null}
                {story.companyCutNgn > 0 ? (
                  <div className="flex justify-between py-1 text-amber-900">
                    <span>Company cut retained</span>
                    <span className="font-bold font-mono">-{formatNgn(story.companyCutNgn)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between py-1 text-slate-800">
                  <span className="font-semibold">Approved for Cash</span>
                  <span className="font-bold font-mono">{formatNgn(story.approvedNgn)}</span>
                </div>
                {story.unclearedHoldNgn > 0 ? (
                  <div className="flex justify-between py-1 text-amber-900">
                    <span>Uncleared receipts hold</span>
                    <span className="font-bold font-mono">-{formatNgn(story.unclearedHoldNgn)}</span>
                  </div>
                ) : null}
                {story.settledAtApprovalNgn > 0 ? (
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Settled at approval</span>
                    <span className="font-bold font-mono">-{formatNgn(story.settledAtApprovalNgn)}</span>
                  </div>
                ) : null}
                {story.treasuryPaidNgn > 0 ? (
                  <div className="flex justify-between py-1 text-emerald-800">
                    <span>Previously paid from till / bank</span>
                    <span className="font-bold font-mono">-{formatNgn(story.treasuryPaidNgn)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-2 text-sm font-black text-rose-700">
                  <span>Net Cash Payable Now</span>
                  <span className="font-mono">{formatNgn(story.cashDueNgn)}</span>
                </div>
              </div>
            </div>

            {/* Back to payment tab action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('payment')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                ← Back to payment execution
              </button>
            </div>
          </div>
        </ModalScrollBody>

        <ModalScrollFooter>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Posts immediately to treasury register</span>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-slate-500 hover:text-slate-800 font-semibold transition"
            >
              Close dialog
            </button>
          </div>
        </ModalScrollFooter>
      </ModalScrollShell>
    </ModalFrame>
  );
}
