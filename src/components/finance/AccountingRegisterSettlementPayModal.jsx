import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  Info,
  Plus,
  Receipt,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { ModalFrame, ModalScrollShell, ModalScrollHeader, ModalScrollBody, ModalScrollFooter } from '../layout';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useRegisterSettlementMutations } from '../../hooks/useAccountingRegisterSettlements';
import { createRequestPayLine, mapTreasuryPayoutLinesForApi } from '../../lib/accountCore';
import { registerSettlementOutstandingNgn } from '../../lib/registerSettlementPay';
import { treasuryAccountDisplayName, treasuryAccountsForWorkspace } from '../../lib/treasuryAccountsStore';
import {
  findTreasuryPayoutShortAccount,
  treasuryBookBalanceByAccountId,
  treasuryBookDisplayNgn,
} from '../../lib/financeDeskTreasury';

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
 * Cashier register withdrawal payout — matching the high-polish Refund Payout pattern.
 * @param {{ settlement: object | null; open: boolean; onClose: () => void; onPaid: () => void }} props
 */
export function AccountingRegisterSettlementPayModal({ settlement, open, onClose, onPaid }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const { busy, error, paySettlement } = useRegisterSettlementMutations();
  const [activeTab, setActiveTab] = useState('disbursement'); // 'disbursement' | 'details'

  const treasuryMovements = useMemo(
    () => (Array.isArray(ws?.snapshot?.treasuryMovements) ? ws.snapshot.treasuryMovements : []),
    [ws?.snapshot?.treasuryMovements]
  );

  const treasuryAccounts = useMemo(
    () => treasuryAccountsForWorkspace(ws?.snapshot, ws?.session),
    [ws?.snapshot, ws?.session]
  );

  const treasuryBookByAccountId = useMemo(
    () => treasuryBookBalanceByAccountId(treasuryAccounts, treasuryMovements),
    [treasuryAccounts, treasuryMovements]
  );

  const bankAccountsSelectOrder = useMemo(
    () =>
      [...treasuryAccounts].sort((a, b) =>
        treasuryAccountDisplayName(a).localeCompare(treasuryAccountDisplayName(b), undefined, {
          sensitivity: 'base',
        })
      ),
    [treasuryAccounts]
  );

  const defaultAccountId = bankAccountsSelectOrder[0]?.id ?? '';

  const approvedNgn = Math.round(Number(settlement?.approvedAmountNgn ?? settlement?.amountNgn) || 0);
  const paidNgn = Math.round(Number(settlement?.paidAmountNgn) || 0);
  const outstanding = settlement ? registerSettlementOutstandingNgn(settlement) : 0;

  const activeActorLabel = ws?.session?.user?.displayName ?? 'Finance';

  const [paidBy, setPaidBy] = useState('');
  const [payLines, setPayLines] = useState([]);
  const [paymentNote, setPaymentNote] = useState('');

  const resetForm = useCallback(() => {
    setPaidBy('');
    setPayLines([]);
    setPaymentNote('');
    setActiveTab('disbursement');
  }, []);

  useEffect(() => {
    if (!open || !settlement) return;
    setPaidBy('');
    setPaymentNote(settlement.paymentNote || settlement.reason || '');
    setPayLines([createRequestPayLine(defaultAccountId, outstanding > 0 ? outstanding : '')]);
    setActiveTab('disbursement');
  }, [open, settlement, outstanding, defaultAccountId]);

  const payTotalNgn = useMemo(
    () => payLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [payLines]
  );

  const remainingAfterPost = Math.max(0, outstanding - payTotalNgn);

  const updatePayLine = (lineId, patch) => {
    setPayLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const addPayLine = () => {
    setPayLines((prev) => [...prev, createRequestPayLine(defaultAccountId)]);
  };

  const removePayLine = (lineId) => {
    setPayLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== lineId)));
  };

  const handleClose = () => {
    if (busy) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!settlement?.settlementId || busy) return;

    const paidByLabel = paidBy.trim() || activeActorLabel;
    const validLines = mapTreasuryPayoutLinesForApi(payLines);
    if (validLines.length === 0) {
      showToast('Add at least one payout line.', { variant: 'error' });
      return;
    }
    if (payTotalNgn <= 0) {
      showToast('Payout total must be positive.', { variant: 'error' });
      return;
    }
    if (payTotalNgn > outstanding) {
      showToast('Payout exceeds the approved outstanding balance.', { variant: 'error' });
      return;
    }

    const shortAccount = findTreasuryPayoutShortAccount(
      validLines,
      bankAccountsSelectOrder,
      treasuryBookByAccountId
    );
    if (shortAccount) {
      showToast(`Insufficient balance in ${shortAccount.name}.`, { variant: 'error' });
      return;
    }

    const result = await paySettlement(settlement.settlementId, {
      paidBy: paidByLabel,
      paymentNote: paymentNote.trim(),
      note: paymentNote.trim(),
      paymentLines: validLines.map((line) => ({
        treasuryAccountId: line.treasuryAccountId,
        amountNgn: line.amountNgn,
        reference: line.reference || settlement.settlementId,
        note: paymentNote.trim(),
        dateISO: line.dateISO,
      })),
    });

    if (result.ok) {
      resetForm();
      onPaid();
    }
  };

  if (!open || !settlement) return null;

  const hasPayeeInfo = Boolean(settlement.payeeName || settlement.payeeBankDetails);
  const partyName = settlement.partyName || settlement.registerName || 'Register party';

  return (
    <ModalFrame
      isOpen={open}
      onClose={handleClose}
      title={`Register Withdrawal Payout ${settlement.settlementId}`}
      surface="plain"
      showCloseButton={false}
    >
      <ModalScrollShell className="max-w-2xl min-h-[min(90vh,620px)] flex flex-col bg-slate-50/50">
        {/* Sticky Header */}
        <ModalScrollHeader className="border-b border-slate-200/90 bg-white/95 backdrop-blur px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-teal-50 text-zarewa-teal border border-teal-100 shrink-0">
                <Wallet size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900">Register Withdrawal Payout</h2>
                  <span className="font-mono text-ui-xs font-bold text-zarewa-teal bg-teal-50/80 border border-teal-200/70 rounded-md px-2 py-0.5">
                    {settlement.settlementId}
                  </span>
                  {settlement.branchId ? (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {settlement.branchId}
                    </span>
                  ) : null}
                </div>
                <p className="text-ui-xs text-slate-500 truncate mt-0.5">
                  {[settlement.registerName, partyName].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close dialog"
              disabled={busy}
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </ModalScrollHeader>

        {/* Modal Body */}
        <ModalScrollBody className="p-5 space-y-4">
          {/* Hero Balance Due Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 p-5 text-white shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-ui-xs font-bold uppercase tracking-wider text-teal-100/90">
                  Approved Withdrawal Due
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight tabular-nums">
                    {formatNgn(outstanding)}
                  </span>
                  {paidNgn > 0 ? (
                    <span className="text-ui-xs text-teal-200 font-semibold tabular-nums">
                      of {formatNgn(approvedNgn)} (₦{paidNgn.toLocaleString('en-NG')} disbursed)
                    </span>
                  ) : null}
                </div>
                {settlement.reason ? (
                  <p className="mt-1.5 text-xs text-teal-100/90 leading-snug line-clamp-2 max-w-xl">
                    {settlement.reason}
                  </p>
                ) : null}
              </div>

              <div className="sm:text-right shrink-0 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
                <div className="flex items-center gap-1.5 sm:justify-end text-ui-xs font-bold uppercase tracking-wider text-teal-100">
                  <User size={13} />
                  <span>Beneficiary / Cashier</span>
                </div>
                <p className="font-bold text-sm text-white mt-0.5 truncate max-w-[200px]" title={settlement.payeeName || partyName}>
                  {settlement.payeeName || partyName}
                </p>
                {settlement.payeeBankDetails ? (
                  <p className="font-mono text-ui-xs font-semibold text-teal-100/90 mt-0.5 truncate max-w-[200px]" title={settlement.payeeBankDetails}>
                    {settlement.payeeBankDetails}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Payee Details Card with Copy */}
          {hasPayeeInfo ? (
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-3.5 text-xs text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800/80">
                  Beneficiary Account Details
                </span>
                <p className="font-bold text-slate-900">{settlement.payeeName || partyName}</p>
                {settlement.payeeBankDetails ? (
                  <p className="font-mono text-xs font-semibold text-slate-800">
                    {settlement.payeeBankDetails}
                  </p>
                ) : null}
              </div>
              {settlement.payeeBankDetails ? (
                <div className="shrink-0 flex items-center gap-2">
                  <CopyButton text={settlement.payeeBankDetails} label="bank details" />
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Workflow Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1" role="tablist" aria-label="Settlement Sections">
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
              <span>Settlement Details</span>
            </button>
          </div>

          {/* TAB 1: DISBURSEMENT */}
          {activeTab === 'disbursement' ? (
            <div className="space-y-4">
              {bankAccountsSelectOrder.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Add at least one treasury account before posting payout.
                </div>
              ) : (
                <form id="register-settlement-form" onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="text-ui-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Paid by (Finance user)
                    </label>
                    <input
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                      placeholder={`e.g. ${activeActorLabel} — GTBank transfer`}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-zarewa-teal focus:ring-1 focus:ring-zarewa-teal"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                      Disbursement Treasury Accounts
                    </span>
                    <button
                      type="button"
                      onClick={addPayLine}
                      className="inline-flex items-center gap-1 rounded-lg border border-teal-200/90 bg-teal-50 px-2.5 py-1 text-ui-xs font-black uppercase tracking-wide text-zarewa-teal hover:bg-teal-100 transition-colors"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      Add line
                    </button>
                  </div>

                  <div className="space-y-2">
                    {payLines.map((line, idx) => (
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
                            onChange={(e) => updatePayLine(line.id, { treasuryAccountId: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-zarewa-teal focus:ring-1 focus:ring-zarewa-teal"
                          >
                            <option value="">Select treasury account…</option>
                            {bankAccountsSelectOrder.map((a) => (
                              <option key={a.id} value={String(a.id)}>
                                {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a, treasuryBookByAccountId))})
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
                              onChange={(e) => updatePayLine(line.id, { dateISO: e.target.value })}
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
                              onChange={(e) => updatePayLine(line.id, { amount: e.target.value })}
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
                              onChange={(e) => updatePayLine(line.id, { reference: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 py-1.5 px-2 text-xs text-slate-800"
                              placeholder="Transfer ref / cash"
                            />
                          </div>
                          <div className="sm:col-span-1 pt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removePayLine(line.id)}
                              disabled={payLines.length <= 1}
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
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-zarewa-teal focus:ring-1 focus:ring-zarewa-teal"
                      placeholder="e.g. Cash batch voucher #82; Paid to register custodian"
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

                  {error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0 text-rose-600" />
                      <span>{error}</span>
                    </div>
                  ) : null}
                </form>
              )}
            </div>
          ) : null}

          {/* TAB 2: DETAILS */}
          {activeTab === 'details' ? (
            <div className="space-y-4">
              {settlement.reason ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Withdrawal Reason / Purpose
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {settlement.reason}
                  </p>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Requested by</span>
                  <span className="font-semibold text-slate-800">
                    {settlement.requestedByName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Approved by</span>
                  <span className="font-semibold text-slate-800">
                    {settlement.approvedByName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Register Name</span>
                  <span className="font-semibold text-slate-800">
                    {settlement.registerName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Settlement ID</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {settlement.settlementId}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </ModalScrollBody>

        {/* Sticky Action Footer */}
        <ModalScrollFooter className="border-t border-slate-200/90 bg-white px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-ui-xs text-slate-500 w-full sm:w-auto">
            {payTotalNgn > 0 ? (
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
              disabled={busy}
              onClick={handleClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || payTotalNgn <= 0}
              onClick={handleSubmit}
              className="rounded-xl bg-zarewa-teal px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Posting payout…' : 'Post withdrawal payout'}
            </button>
          </div>
        </ModalScrollFooter>
      </ModalScrollShell>
    </ModalFrame>
  );
}
