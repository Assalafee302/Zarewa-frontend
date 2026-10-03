import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Banknote,
  Building2,
  Check,
  Copy,
  Info,
  Plus,
  Receipt,
  Trash2,
  Truck,
  User,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { ModalFrame, ModalScrollShell, ModalScrollHeader, ModalScrollBody, ModalScrollFooter } from '../layout';
import { formatNgn } from '../../Data/mockData';
import { ExpenseCategoryPayoutReadinessPanel } from '../office/ExpenseCategoryPayoutReadinessPanel.jsx';
import {
  maintenanceCostKindLabel,
  looksLikeMaintenanceWorkOrderRef,
} from '../../shared/lib/maintenanceCostEnvelope';

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

export function PaymentRequestPayoutModal({
  isOpen,
  onClose,
  selectedPayment,
  bankAccounts = [],
  bankAccountsSelectOrder = [],
  treasuryBookDisplayNgn = () => 0,
  treasuryAccountDisplayName = (a) => a?.name || 'Account',
  requestPayLines = [],
  onAddPayLine,
  onUpdatePayLine,
  onRemovePayLine,
  requestPayNote = '',
  onRequestPayNoteChange,
  paymentGlPreview = null,
  isSubmitting = false,
  canPayRequests = true,
  cancelPayRequestBusyId = '',
  onCancelPaymentRequest,
  onConfirmPay,
}) {
  const [activeTab, setActiveTab] = useState('disbursement'); // 'disbursement' | 'details'

  const isPoTransport = selectedPayment?.type === 'po_transport';
  const id = String(selectedPayment?.id || '').trim();

  const totalAmount = Math.round(Number(selectedPayment?.total) || 0);
  const paidAmount = Math.round(Number(selectedPayment?.paid) || 0);
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  const payTotalNgn = useMemo(
    () => requestPayLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [requestPayLines]
  );

  const remainingAfterPost = Math.max(0, balanceDue - payTotalNgn);

  const payeeName = String(selectedPayment?.payeeName || selectedPayment?.desc || '').trim();
  const payeeBankName = String(selectedPayment?.payeeBankName || '').trim();
  const payeeAccountNo = String(selectedPayment?.payeeAccountNo || '').trim();
  const hasPayeeInfo = Boolean(payeeName || payeeBankName || payeeAccountNo);

  const workOrderRef =
    selectedPayment?.maintenanceWorkOrderId ||
    (looksLikeMaintenanceWorkOrderRef(selectedPayment?.requestReference)
      ? selectedPayment?.requestReference
      : '');

  const hasDetailsTab = Boolean(
    selectedPayment?.description ||
      workOrderRef ||
      selectedPayment?.approvalNote ||
      paymentGlPreview ||
      selectedPayment?.approvedBy
  );

  const gateBlocked =
    !isPoTransport &&
    paymentGlPreview?.payoutGate &&
    paymentGlPreview.payoutGate.ok === false;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={isPoTransport ? `PO Transport Payment ${id}` : `Expense Payout ${id}`}
      surface="plain"
      showCloseButton={false}
    >
      <ModalScrollShell className="max-w-2xl min-h-[min(90vh,640px)] flex flex-col bg-slate-50/50">
        {/* Sticky Header */}
        <ModalScrollHeader className="border-b border-slate-200/90 bg-white/95 backdrop-blur px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-2 rounded-xl border shrink-0 ${
                  isPoTransport
                    ? 'bg-sky-50 text-sky-700 border-sky-100'
                    : 'bg-teal-50 text-zarewa-teal border-teal-100'
                }`}
              >
                {isPoTransport ? <Truck size={18} /> : <Banknote size={18} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900">
                    {isPoTransport ? 'PO Transport Payment' : 'Expense Payout'}
                  </h2>
                  <span className="font-mono text-ui-xs font-bold text-zarewa-teal bg-teal-50/80 border border-teal-200/70 rounded-md px-2 py-0.5">
                    {isPoTransport ? `PO ${id}` : id}
                  </span>
                  {selectedPayment?.branchId ? (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {selectedPayment.branchId}
                    </span>
                  ) : null}
                </div>
                <p className="text-ui-xs text-slate-500 truncate mt-0.5">
                  {[
                    selectedPayment?.expenseCategory || selectedPayment?.category,
                    selectedPayment?.desc !== payeeName ? selectedPayment?.desc : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || (isPoTransport ? 'Haulage settlement' : 'Payment request')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isPoTransport && canPayRequests && onCancelPaymentRequest ? (
                <button
                  type="button"
                  disabled={isSubmitting || cancelPayRequestBusyId === id}
                  onClick={() => onCancelPaymentRequest(selectedPayment)}
                  className="rounded-xl border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors disabled:opacity-40"
                  title="Refuse payment request"
                >
                  {cancelPayRequestBusyId === id ? 'Refusing…' : 'Refuse'}
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Close dialog"
                disabled={isSubmitting}
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
          </div>
        </ModalScrollHeader>

        {/* Modal Body */}
        <ModalScrollBody className="p-5 space-y-4">
          {/* Hero Balance Due Card */}
          <div
            className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-sm ${
              isPoTransport
                ? 'bg-gradient-to-br from-sky-700 via-teal-700 to-zarewa-teal'
                : 'bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-ui-xs font-bold uppercase tracking-wider text-teal-100/90">
                  {isPoTransport ? 'Transport Fee Balance Due' : 'Balance Due / Payable Now'}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight tabular-nums">
                    {formatNgn(balanceDue)}
                  </span>
                  {paidAmount > 0 ? (
                    <span className="text-ui-xs text-teal-200 font-semibold tabular-nums">
                      of {formatNgn(totalAmount)} (₦{paidAmount.toLocaleString('en-NG')} paid)
                    </span>
                  ) : null}
                </div>
                {selectedPayment?.description ? (
                  <p className="mt-1.5 text-xs text-teal-100/90 leading-snug line-clamp-2 max-w-xl">
                    {selectedPayment.description}
                  </p>
                ) : null}
              </div>

              {hasPayeeInfo ? (
                <div className="sm:text-right shrink-0 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
                  <div className="flex items-center gap-1.5 sm:justify-end text-ui-xs font-bold uppercase tracking-wider text-teal-100">
                    <User size={13} />
                    <span>Payee</span>
                  </div>
                  <p className="font-bold text-sm text-white mt-0.5 truncate max-w-[200px]" title={payeeName}>
                    {payeeName || '—'}
                  </p>
                  {payeeAccountNo ? (
                    <p className="font-mono text-ui-xs font-semibold text-teal-100/90 mt-0.5 tabular-nums">
                      {[payeeBankName, payeeAccountNo].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Beneficiary Bank Account Card with Copy Action */}
          {hasPayeeInfo && (payeeAccountNo || payeeBankName) ? (
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-3.5 text-xs text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800/80">
                  Beneficiary Account (Transfer Target)
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {payeeBankName ? (
                    <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                      <Building2 size={13} className="text-sky-700" />
                      {payeeBankName}
                    </span>
                  ) : null}
                  {payeeAccountNo ? (
                    <span className="font-mono text-sm font-black tracking-wider text-slate-900">
                      {payeeAccountNo}
                    </span>
                  ) : null}
                </div>
                {payeeName ? <p className="text-ui-xs text-slate-600 font-medium">Account name: {payeeName}</p> : null}
              </div>

              {payeeAccountNo ? (
                <div className="shrink-0 flex items-center gap-2">
                  <CopyButton text={payeeAccountNo} label="account number" />
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Workflow Tabs (Disbursement vs Details & Breakdown) */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1" role="tablist" aria-label="Payout Sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'disbursement'}
              onClick={() => setActiveTab('disbursement')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'disbursement'
                  ? 'bg-zarewa-teal text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Wallet size={14} />
              <span>Disbursement</span>
            </button>
            {hasDetailsTab ? (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'details'}
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  activeTab === 'details'
                    ? 'bg-zarewa-teal text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Receipt size={14} />
                <span>Details & GL Readiness</span>
                {gateBlocked ? (
                  <span className="size-2 rounded-full bg-rose-500 ring-2 ring-white" />
                ) : null}
              </button>
            ) : null}
          </div>

          {/* TAB 1: DISBURSEMENT */}
          {activeTab === 'disbursement' ? (
            <div className="space-y-4">
              {bankAccounts.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Add at least one treasury account before posting payout.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                      Disbursement Treasury Accounts
                    </span>
                    <button
                      type="button"
                      onClick={onAddPayLine}
                      className="inline-flex items-center gap-1 rounded-lg border border-teal-200/90 bg-teal-50 px-2.5 py-1 text-ui-xs font-black uppercase tracking-wide text-zarewa-teal hover:bg-teal-100 transition-colors"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      Add line
                    </button>
                  </div>

                  <div className="space-y-2">
                    {requestPayLines.map((line, idx) => (
                      <div
                        key={line.id || idx}
                        className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs space-y-2"
                      >
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Disbursement Treasury Account
                          </label>
                          <select
                            value={line.treasuryAccountId}
                            onChange={(e) =>
                              onUpdatePayLine(line.id, { treasuryAccountId: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-zarewa-teal focus:ring-1 focus:ring-zarewa-teal"
                          >
                            <option value="">Select treasury account…</option>
                            {bankAccountsSelectOrder.map((a) => (
                              <option key={a.id} value={String(a.id)}>
                                {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a))})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-4">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              Date
                            </label>
                            <input
                              type="date"
                              value={line.dateISO}
                              onChange={(e) => onUpdatePayLine(line.id, { dateISO: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 py-1.5 px-2 text-xs font-semibold text-slate-800"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              Amount ₦
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={line.amount}
                              onChange={(e) => onUpdatePayLine(line.id, { amount: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs font-bold text-zarewa-teal"
                              placeholder="Amount ₦"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              Reference
                            </label>
                            <input
                              type="text"
                              value={line.reference}
                              onChange={(e) => onUpdatePayLine(line.id, { reference: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 py-1.5 px-2 text-xs text-slate-800"
                              placeholder="Transfer ref / cash"
                            />
                          </div>
                          <div className="sm:col-span-1 pt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onRemovePayLine(line.id)}
                              disabled={requestPayLines.length <= 1}
                              className="p-1.5 text-slate-300 hover:text-rose-600 disabled:opacity-20 transition-colors"
                              title="Remove line"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payment Note */}
                  <div className="space-y-1">
                    <label className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                      Payment Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={requestPayNote}
                      onChange={(e) => onRequestPayNoteChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-zarewa-teal focus:ring-1 focus:ring-zarewa-teal"
                      placeholder="e.g. Paid via GTBank web transfer; cash batch voucher #104"
                    />
                  </div>

                  {/* Live Calculation Summary */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-500">
                        This Payout Amount
                      </span>
                      <span className="font-black text-sm text-zarewa-teal tabular-nums">
                        {formatNgn(payTotalNgn)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="font-bold uppercase tracking-wider text-slate-500">
                        Remaining Balance After Post
                      </span>
                      <span
                        className={`font-black text-sm tabular-nums ${
                          remainingAfterPost === 0 ? 'text-emerald-700' : 'text-slate-800'
                        }`}
                      >
                        {formatNgn(remainingAfterPost)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* TAB 2: DETAILS & BREAKDOWN */}
          {activeTab === 'details' ? (
            <div className="space-y-4">
              {/* Context & Description */}
              {selectedPayment?.description ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Memo / Description
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {selectedPayment.description}
                  </p>
                </div>
              ) : null}

              {/* Maintenance Work Order Context */}
              {workOrderRef ? (
                <div className="rounded-xl border border-teal-200/80 bg-teal-50/50 p-3 flex items-start gap-2.5">
                  <Wrench size={16} className="text-zarewa-teal mt-0.5 shrink-0" />
                  <div className="text-xs text-teal-950">
                    <p className="font-bold">Work Order {workOrderRef}</p>
                    {selectedPayment.maintenanceCostKind ? (
                      <p className="text-ui-xs text-teal-800/90 mt-0.5">
                        Kind: {maintenanceCostKindLabel(selectedPayment.maintenanceCostKind)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Approval History & Branch Manager Note */}
              {selectedPayment?.approvalNote ? (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-1">
                  <p className="text-ui-xs font-bold uppercase tracking-wider text-amber-900">
                    Branch Manager Approval Note
                  </p>
                  <p className="whitespace-pre-wrap leading-snug">{selectedPayment.approvalNote}</p>
                </div>
              ) : null}

              {selectedPayment?.requestDate || selectedPayment?.approvedAtISO ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                  {selectedPayment.requestDate ? (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Requested</span>
                      <span className="font-semibold text-slate-800">
                        {String(selectedPayment.requestDate).slice(0, 10)}
                      </span>
                    </div>
                  ) : null}
                  {selectedPayment.approvedAtISO ? (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Approved</span>
                      <span className="font-semibold text-slate-800">
                        {String(selectedPayment.approvedAtISO).slice(0, 10)}
                        {selectedPayment.approvedBy ? ` by ${selectedPayment.approvedBy}` : ''}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* GL Readiness Panel */}
              {!isPoTransport ? (
                <div className="space-y-1">
                  <span className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                    GL Category Readiness
                  </span>
                  <ExpenseCategoryPayoutReadinessPanel
                    glPreview={paymentGlPreview}
                    payoutGate={paymentGlPreview?.payoutGate}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </ModalScrollBody>

        {/* Sticky Action Footer */}
        <ModalScrollFooter className="border-t border-slate-200/90 bg-white px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-ui-xs text-slate-500 w-full sm:w-auto">
            {gateBlocked ? (
              <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                <AlertTriangle size={13} />
                GL Category Review Required
              </span>
            ) : payTotalNgn > 0 ? (
              <span>
                Disbursing <strong className="font-bold text-zarewa-teal">{formatNgn(payTotalNgn)}</strong> from treasury
              </span>
            ) : (
              <span>Enter disbursement amount</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || gateBlocked || payTotalNgn <= 0}
              onClick={onConfirmPay}
              className="rounded-xl bg-zarewa-teal px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Posting payout…'
                : isPoTransport
                  ? 'Confirm transport payout'
                  : 'Post expense payout'}
            </button>
          </div>
        </ModalScrollFooter>
      </ModalScrollShell>
    </ModalFrame>
  );
}
