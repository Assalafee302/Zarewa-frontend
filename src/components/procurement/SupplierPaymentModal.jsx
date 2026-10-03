import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  ExternalLink,
  Info,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { ModalFrame, ModalScrollShell, ModalScrollHeader, ModalScrollBody, ModalScrollFooter } from '../layout';
import { formatNgn } from '../../Data/mockData';
import { payableOutstandingNgn } from '../../lib/procurementPayablesSorting';
import {
  treasuryAccountDisplayName,
} from '../../lib/treasuryAccountsStore';
import {
  treasuryBookDisplayNgn,
} from '../../lib/financeDeskTreasury';

const normalizeNairaInput = (value) => String(value ?? '').replace(/[^\d]/g, '');
const formatNairaInput = (value) => {
  const normalized = normalizeNairaInput(value);
  if (!normalized) return '';
  return Number(normalized).toLocaleString('en-NG');
};

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

/**
 * Supplier AP payment modal — modern treasury payout modal matching the refund payout pattern.
 */
export function SupplierPaymentModal({
  isOpen,
  onClose,
  selectedAp,
  supplier = null,
  apPayLines = [],
  onUpdateApPayLine,
  onAddApPayLine,
  onRemoveApPayLine,
  treasuryAccounts = [],
  treasuryBookByAccountId = {},
  apPayBusy = false,
  onSavePayment,
  onOpenAdjustments,
}) {
  const [activeTab, setActiveTab] = useState('disbursement'); // 'disbursement' | 'details'

  const outstanding = useMemo(
    () => (selectedAp ? payableOutstandingNgn(selectedAp) : 0),
    [selectedAp]
  );

  const apPayTotalNgn = useMemo(
    () => apPayLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [apPayLines]
  );

  const remainingAfterPost = Math.max(0, outstanding - apPayTotalNgn);
  const isFullySettled = apPayTotalNgn > 0 && remainingAfterPost === 0;

  // Find supplier primary bank account if present
  const supplierBank = useMemo(() => {
    if (!supplier) return null;
    if (Array.isArray(supplier.bankAccounts) && supplier.bankAccounts.length > 0) {
      const valid = supplier.bankAccounts.find(
        (b) => String(b.bankName || '').trim() || String(b.accountNumber || '').trim()
      );
      if (valid) return valid;
    }
    if (supplier.bankName || supplier.accountNumber) {
      return {
        bankName: supplier.bankName,
        accountNumber: supplier.accountNumber,
        accountName: supplier.accountName || supplier.supplierName,
      };
    }
    return null;
  }, [supplier]);

  if (!isOpen || !selectedAp) return null;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={apPayBusy}
      surface="plain"
      title={`Supplier Payment ${selectedAp.apID || ''}`}
      showCloseButton={false}
    >
      <ModalScrollShell className="max-w-2xl bg-white shadow-2xl rounded-2xl border border-slate-200/80">
        {/* Sticky Header */}
        <ModalScrollHeader className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-6 py-4 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-teal-50 text-zarewa-teal border border-teal-100/80 shadow-sm shrink-0">
              <Building2 size={22} className="text-teal-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 leading-none">Supplier Payment</h2>
                <span className="font-mono text-ui-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                  {selectedAp.apID}
                </span>
                {selectedAp.branchId ? (
                  <span className="text-ui-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Branch {selectedAp.branchId}
                  </span>
                ) : null}
              </div>
              <p className="text-ui-xs text-slate-500 mt-1 truncate">
                {selectedAp.supplierName}
                {selectedAp.invoiceRef ? ` · Invoice: ${selectedAp.invoiceRef}` : ''}
                {selectedAp.poRef ? ` · PO: ${selectedAp.poRef}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={apPayBusy}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors shrink-0 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </ModalScrollHeader>

        {/* Scrollable Body */}
        <ModalScrollBody className="p-6 space-y-5">
          {/* Hero Balance Due Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-900 via-emerald-950 to-slate-900 p-5 text-white shadow-lg border border-teal-800/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-ui-xs font-bold uppercase tracking-wider text-teal-200/90">
                  Outstanding Payable Due
                </p>
                <p className="text-3xl font-extrabold tracking-tight text-white mt-1 tabular-nums">
                  {formatNgn(outstanding)}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-ui-xs font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Payable Due
                </span>
                <p className="font-semibold text-teal-100 text-xs mt-1 truncate max-w-[200px]" title={selectedAp.supplierName}>
                  {selectedAp.supplierName}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-teal-800/60 grid grid-cols-3 gap-3 text-ui-xs tabular-nums">
              <div>
                <span className="text-teal-300/70 block uppercase">Invoice Total</span>
                <span className="font-semibold text-teal-100 block mt-0.5">{formatNgn(Number(selectedAp.amountNgn) || 0)}</span>
              </div>
              <div>
                <span className="text-teal-300/70 block uppercase">Previously Paid</span>
                <span className="font-semibold text-teal-100 block mt-0.5">{formatNgn(Number(selectedAp.paidNgn) || 0)}</span>
              </div>
              <div>
                <span className="text-teal-300/70 block uppercase">PO Reference</span>
                <span className="font-semibold text-teal-100 block mt-0.5">{selectedAp.poRef || '—'}</span>
              </div>
            </div>
          </div>

          {/* Supplier Bank Details Card */}
          {supplierBank && (supplierBank.accountNumber || supplierBank.bankName) ? (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-ui-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building2 size={14} className="text-slate-400" />
                  Supplier Settlement Bank
                </span>
                <CopyButton text={supplierBank.accountNumber} label="Account number" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-ui-xs text-slate-400 block uppercase">Bank Name</span>
                  <span className="font-semibold text-slate-800">{supplierBank.bankName || '—'}</span>
                </div>
                <div>
                  <span className="text-ui-xs text-slate-400 block uppercase">Account Number</span>
                  <span className="font-mono font-bold text-slate-900">{supplierBank.accountNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-ui-xs text-slate-400 block uppercase">Account Name</span>
                  <span className="font-semibold text-slate-800 truncate block" title={supplierBank.accountName}>
                    {supplierBank.accountName || selectedAp.supplierName}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Workflow Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('disbursement')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'disbursement'
                  ? 'border-zarewa-teal text-zarewa-teal'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Wallet size={15} />
              Disbursement
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-zarewa-teal text-zarewa-teal'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Info size={15} />
              Payable & PO Details
            </button>
          </div>

          {/* TAB 1: Disbursement */}
          {activeTab === 'disbursement' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                    Treasury Payout Lines
                  </label>
                  <button
                    type="button"
                    onClick={onAddApPayLine}
                    className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-ui-xs font-bold text-zarewa-teal hover:bg-teal-100 transition-colors"
                  >
                    <Plus size={13} />
                    Add line
                  </button>
                </div>

                <div className="space-y-2">
                  {apPayLines.map((line, idx) => (
                    <div
                      key={line.id}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-ui-xs font-bold text-slate-400">Line {idx + 1}</span>
                        {apPayLines.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => onRemoveApPayLine(line.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove line"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-6">
                          <select
                            value={line.treasuryAccountId}
                            onChange={(e) => onUpdateApPayLine(line.id, { treasuryAccountId: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-zarewa-teal focus:outline-none"
                          >
                            <option value="">Select treasury account…</option>
                            {treasuryAccounts.map((a) => (
                              <option key={a.id} value={String(a.id)}>
                                {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a, treasuryBookByAccountId))})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="date"
                            value={line.dateISO}
                            onChange={(e) => onUpdateApPayLine(line.id, { dateISO: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-zarewa-teal focus:outline-none"
                            title="Payment date"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatNairaInput(line.amount)}
                            onChange={(e) =>
                              onUpdateApPayLine(line.id, { amount: normalizeNairaInput(e.target.value) })
                            }
                            placeholder="Amount ₦"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-zarewa-teal tabular-nums focus:border-zarewa-teal focus:outline-none"
                          />
                        </div>
                      </div>

                      <input
                        type="text"
                        value={line.reference}
                        onChange={(e) => onUpdateApPayLine(line.id, { reference: e.target.value })}
                        placeholder="Reference / Cheque # / Transfer session ID (optional)"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:border-zarewa-teal focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Calculation Summary */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">This Payout Amount:</span>
                  <span className="font-black text-slate-900 tabular-nums text-sm">
                    {formatNgn(apPayTotalNgn)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Remaining Balance After Post:</span>
                  <span className="font-bold text-slate-700 tabular-nums">
                    {formatNgn(remainingAfterPost)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Settlement Status:</span>
                  {isFullySettled ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Check size={12} /> Full settlement of payable
                    </span>
                  ) : apPayTotalNgn > 0 ? (
                    <span className="inline-flex items-center gap-1 font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                      <Info size={12} /> Partial payment — leaves {formatNgn(remainingAfterPost)}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium">Awaiting disbursement amount</span>
                  )}
                </div>
              </div>

              <p className="text-ui-xs text-slate-500 leading-relaxed">
                Saving this payout writes treasury movements and keeps the payable open until the invoice balance is fully paid.
              </p>
            </div>
          ) : null}

          {/* TAB 2: Details & Adjustments */}
          {activeTab === 'details' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
                <p className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                  Payable Information
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-ui-xs uppercase">Payable ID</span>
                    <span className="font-mono font-bold text-slate-800">{selectedAp.apID}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-ui-xs uppercase">Supplier</span>
                    <span className="font-bold text-slate-800">{selectedAp.supplierName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-ui-xs uppercase">Invoice Reference</span>
                    <span className="font-semibold text-slate-800">{selectedAp.invoiceRef || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-ui-xs uppercase">Purchase Order</span>
                    <span className="font-semibold text-slate-800">{selectedAp.poRef || '—'}</span>
                  </div>
                </div>
              </div>

              {selectedAp.poRef && onOpenAdjustments ? (
                <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                    <ExternalLink size={14} className="text-sky-700" />
                    <span>Special Payments & Adjustments</span>
                  </div>
                  <p className="text-ui-xs text-sky-800 leading-relaxed">
                    Need to handle a second payment against this purchase order, correct an erroneous amount, or process a supplier refund?
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenAdjustments(String(selectedAp.poRef))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-900 bg-white rounded-lg border border-sky-200 hover:bg-sky-100/80 transition-colors shadow-2xs"
                  >
                    Open PO Adjustments for {selectedAp.poRef}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </ModalScrollBody>

        {/* Sticky Action Footer */}
        <ModalScrollFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200/80 px-6 py-4 bg-slate-50/95">
          <div className="text-ui-xs text-slate-600 font-medium">
            <span>
              This payout:{' '}
              <strong className="text-slate-900 tabular-nums font-bold">
                {formatNgn(apPayTotalNgn)}
              </strong>
              {apPayTotalNgn > 0 && apPayTotalNgn <= outstanding ? (
                <span className="text-emerald-700 ml-1.5 font-bold">✓ Ready</span>
              ) : null}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={apPayBusy}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSavePayment}
              disabled={apPayBusy || apPayTotalNgn <= 0 || apPayTotalNgn > outstanding}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-wide text-white bg-zarewa-teal hover:bg-teal-800 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {apPayBusy ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving payment…</span>
                </>
              ) : (
                <span>Post Supplier Payment</span>
              )}
            </button>
          </div>
        </ModalScrollFooter>
      </ModalScrollShell>
    </ModalFrame>
  );
}

export default SupplierPaymentModal;
