import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Check,
  Clock,
  Copy,
  FileText,
  Info,
  Plus,
  Trash2,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { ModalFrame, ModalScrollShell, ModalScrollHeader, ModalScrollBody, ModalScrollFooter } from '../layout';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { getOtRequest, payOtRequest } from '../../lib/otRequestsApi';
import { OT_STATUS } from '../../lib/otConstants';
import { createRequestPayLine, mapTreasuryPayoutLinesForApi } from '../../lib/accountCore';
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
 * Cashier OT payout popup — modern treasury payout modal matching the refund payout pattern.
 */
export function CashierOtPayModal({ requestId = '', open, onClose, onPaid }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [payLines, setPayLines] = useState([]);
  const [paymentNote, setPaymentNote] = useState('');
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
  const activeActorLabel = ws?.session?.user?.displayName ?? 'Finance';

  const lockedPayable = Math.round(Number(detail?.request?.totalPayableNgn) || 0);

  const load = useCallback(async () => {
    const id = String(requestId || '').trim();
    if (!id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setLoadError('');
    const res = await getOtRequest(id).catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setDetail(null);
      setLoadError(res.data?.error || 'Could not open OT request');
      return;
    }
    if (String(res.data?.request?.status) !== OT_STATUS.APPROVED) {
      setDetail(null);
      setLoadError('This OT request is not ready for payout.');
      return;
    }
    setDetail(res.data);
  }, [requestId]);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setLoadError('');
      setPaidBy('');
      setPayLines([]);
      setPaymentNote('');
      setActiveTab('disbursement');
      return;
    }
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open || !detail?.request) return;
    const amount = Math.round(Number(detail.request.totalPayableNgn) || 0);
    setPaidBy('');
    setPaymentNote(detail.request.reason || '');
    setPayLines([createRequestPayLine(defaultAccountId, amount > 0 ? amount : '')]);
  }, [open, detail, defaultAccountId]);

  const payTotalNgn = useMemo(
    () => payLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [payLines]
  );

  const isExactMatch = payTotalNgn === lockedPayable && lockedPayable > 0;
  const payDifference = lockedPayable - payTotalNgn;

  const updatePayLine = (lineId, patch) => {
    setPayLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };
  const addPayLine = () => setPayLines((prev) => [...prev, createRequestPayLine(defaultAccountId)]);
  const removePayLine = (lineId) => {
    setPayLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== lineId)));
  };

  const handleClose = () => {
    if (busy) return;
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const id = String(requestId || '').trim();
    if (!id || busy || !detail?.request) return;

    const validLines = mapTreasuryPayoutLinesForApi(payLines);
    if (validLines.length === 0) {
      showToast('Add at least one payout line.', { variant: 'error' });
      return;
    }
    if (payTotalNgn <= 0) {
      showToast('Payout total must be positive.', { variant: 'error' });
      return;
    }
    if (payTotalNgn !== lockedPayable) {
      showToast(`Payout must equal the locked payable (${formatNgn(lockedPayable)}).`, {
        variant: 'error',
      });
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

    setBusy(true);
    const res = await payOtRequest(id, {
      paidBy: paidBy.trim() || activeActorLabel,
      paymentNote: paymentNote.trim(),
      paymentLines: validLines.map((line) => ({
        treasuryAccountId: line.treasuryAccountId,
        amountNgn: line.amountNgn,
        reference: line.reference || id,
        note: paymentNote.trim(),
        dateISO: line.dateISO,
      })),
    }).catch(() => ({ ok: false }));
    setBusy(false);

    if (!res.ok || res.data?.ok === false) {
      showToast(res.data?.error || 'OT payout failed', { variant: 'error' });
      return;
    }
    showToast(`OT paid · ${formatNgn(res.data?.request?.totalPayableNgn)}`, { variant: 'success' });
    onPaid?.();
    onClose?.();
  };

  if (!open) return null;
  const req = detail?.request;
  const staffLines = Array.isArray(detail?.staffLines) ? detail.staffLines : [];
  const paymentLine = detail?.paymentLine;
  const workDetails = detail?.workDetails;

  return (
    <ModalFrame
      isOpen={open}
      onClose={handleClose}
      closeDisabled={busy}
      surface="plain"
      title={`Overtime Payout ${req?.id || ''}`}
      showCloseButton={false}
    >
      <ModalScrollShell className="max-w-2xl bg-white shadow-2xl rounded-2xl border border-slate-200/80">
        {/* Sticky Header */}
        <ModalScrollHeader className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-6 py-4 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-teal-50 text-zarewa-teal border border-teal-100/80 shadow-sm shrink-0">
              <Banknote size={22} className="text-teal-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 leading-none">Overtime Payout</h2>
                {req?.id ? (
                  <span className="font-mono text-ui-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                    {req.id}
                  </span>
                ) : null}
                {req?.branchId ? (
                  <span className="text-ui-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Branch {req.branchId}
                  </span>
                ) : null}
              </div>
              <p className="text-ui-xs text-slate-500 mt-1 truncate">
                {req ? (
                  <>
                    {req.dayIso} · {req.workType}
                    {req.quotationRef ? ` · Ref: ${req.quotationRef}` : ''}
                    {req.poId ? ` · PO: ${req.poId}` : ''}
                  </>
                ) : (
                  'Overtime treasury settlement'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors shrink-0 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </ModalScrollHeader>

        {/* Scrollable Body */}
        <ModalScrollBody className="p-6 space-y-5">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zarewa-teal border-t-transparent" />
              <p className="text-xs text-slate-500">Loading OT request details…</p>
            </div>
          ) : null}

          {loadError ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-900">
              <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-950">Unable to load OT request</p>
                <p className="text-rose-800">{loadError}</p>
              </div>
            </div>
          ) : null}

          {!loading && req ? (
            <>
              {/* Hero Balance Due Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-900 via-emerald-950 to-slate-900 p-5 text-white shadow-lg border border-teal-800/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-ui-xs font-bold uppercase tracking-wider text-teal-200/90">
                      Total Overtime Payable Due
                    </p>
                    <p className="text-3xl font-extrabold tracking-tight text-white mt-1 tabular-nums">
                      {formatNgn(lockedPayable)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-ui-xs font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                      Approved & Ready
                    </span>
                    <p className="text-ui-xs text-teal-200/80 mt-1">
                      {staffLines.length} Staff {staffLines.length === 1 ? 'Member' : 'Members'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-teal-800/60 grid grid-cols-2 sm:grid-cols-3 gap-3 text-ui-xs">
                  <div>
                    <span className="text-teal-300/70 block uppercase">Work Type</span>
                    <span className="font-semibold text-teal-100 truncate block mt-0.5">{req.workType || 'Overtime'}</span>
                  </div>
                  <div>
                    <span className="text-teal-300/70 block uppercase">Requested By</span>
                    <span className="font-semibold text-teal-100 truncate block mt-0.5">{req.createdByName || '—'}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-teal-300/70 block uppercase">Approved By</span>
                    <span className="font-semibold text-teal-100 truncate block mt-0.5">{req.approvedByName || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Beneficiary / Staff Summary Card */}
              {staffLines.length > 0 ? (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-ui-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Users size={14} className="text-slate-400" />
                      Staff Beneficiaries ({staffLines.length})
                    </span>
                    <span className="text-ui-xs text-slate-500 font-medium">
                      Date: {req.dayIso}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {staffLines.map((s) => (
                      <div
                        key={s.id || s.staffUserId}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-2xs"
                      >
                        <User size={13} className="text-slate-400" />
                        <span className="font-semibold text-slate-800">
                          {s.displayName || s.username || s.staffUserId}
                        </span>
                        {s.roleLabel ? (
                          <span className="text-ui-xs text-slate-500">· {s.roleLabel}</span>
                        ) : null}
                      </div>
                    ))}
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
                  Overtime Details & Staff ({staffLines.length})
                </button>
              </div>

              {/* TAB 1: Disbursement */}
              {activeTab === 'disbursement' ? (
                <div className="space-y-4">
                  {bankAccountsSelectOrder.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">No Treasury Accounts Configured</p>
                        <p className="mt-0.5">Please add at least one treasury account before posting OT payouts.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-ui-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Disbursed By (Finance Actor)
                        </label>
                        <input
                          type="text"
                          value={paidBy}
                          onChange={(e) => setPaidBy(e.target.value)}
                          placeholder={`e.g. ${activeActorLabel} — cash / bank transfer`}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-zarewa-teal focus:outline-none focus:ring-1 focus:ring-zarewa-teal"
                        />
                      </div>

                      {/* Multi-line Treasury Breakdown */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                            Treasury Payout Lines
                          </label>
                          <button
                            type="button"
                            onClick={addPayLine}
                            className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-ui-xs font-bold text-zarewa-teal hover:bg-teal-100 transition-colors"
                          >
                            <Plus size={13} />
                            Add line
                          </button>
                        </div>

                        <div className="space-y-2">
                          {payLines.map((line, idx) => (
                            <div
                              key={line.id}
                              className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-ui-xs font-bold text-slate-400">Line {idx + 1}</span>
                                {payLines.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => removePayLine(line.id)}
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
                                    onChange={(e) => updatePayLine(line.id, { treasuryAccountId: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-zarewa-teal focus:outline-none"
                                  >
                                    <option value="">Select treasury account…</option>
                                    {bankAccountsSelectOrder.map((a) => (
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
                                    onChange={(e) => updatePayLine(line.id, { dateISO: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-zarewa-teal focus:outline-none"
                                    title="Disbursement Date"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={line.amount}
                                    onChange={(e) => updatePayLine(line.id, { amount: e.target.value })}
                                    placeholder="Amount ₦"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-zarewa-teal tabular-nums focus:border-zarewa-teal focus:outline-none"
                                  />
                                </div>
                              </div>

                              <input
                                type="text"
                                value={line.reference}
                                onChange={(e) => updatePayLine(line.id, { reference: e.target.value })}
                                placeholder="Reference / Cheque # / Transfer session ID (optional)"
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:border-zarewa-teal focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment Note */}
                      <div>
                        <label className="block text-ui-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Payment Note
                        </label>
                        <textarea
                          rows={2}
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder="Audit note for this overtime disbursement (optional)"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-zarewa-teal focus:outline-none"
                        />
                      </div>

                      {/* Live Calculation Summary */}
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-600">This Payout Amount:</span>
                          <span className="font-black text-slate-900 tabular-nums text-sm">
                            {formatNgn(payTotalNgn)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-600">Locked Payable Due:</span>
                          <span className="font-bold text-slate-700 tabular-nums">
                            {formatNgn(lockedPayable)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-600">Disbursement Status:</span>
                          {isExactMatch ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Check size={12} /> Exact match (ready to post)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <AlertCircle size={12} />
                              {payDifference > 0
                                ? `Remaining: ${formatNgn(payDifference)}`
                                : `Exceeds by: ${formatNgn(Math.abs(payDifference))}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {/* TAB 2: Details & Staff */}
              {activeTab === 'details' ? (
                <div className="space-y-4">
                  {/* Reason / Purpose */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-1.5">
                    <p className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                      Overtime Reason / Description
                    </p>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {req.reason || 'No specific reason provided.'}
                    </p>
                  </div>

                  {/* Payment Line & Rate details if present */}
                  {paymentLine ? (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
                      <p className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                        Payment Rate & Category
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-ui-xs uppercase">Category</span>
                          <span className="font-bold text-slate-800">{paymentLine.category || 'Standard'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-ui-xs uppercase">Quantity / Hours</span>
                          <span className="font-bold text-slate-800">{paymentLine.quantity || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-ui-xs uppercase">Approved Rate</span>
                          <span className="font-bold text-slate-800">
                            {paymentLine.rateApproved != null ? formatNgn(Number(paymentLine.rateApproved)) : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-ui-xs uppercase">Approved Amount</span>
                          <span className="font-black text-zarewa-teal">
                            {paymentLine.amountNgn != null ? formatNgn(Number(paymentLine.amountNgn)) : '—'}
                          </span>
                        </div>
                      </div>
                      {paymentLine.remarks ? (
                        <p className="text-ui-xs text-slate-600 pt-1 border-t border-slate-200">
                          <span className="font-bold">Remarks:</span> {paymentLine.remarks}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Work details if present */}
                  {workDetails ? (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
                      <p className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                        Work & Material Output
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-ui-xs uppercase">Work Done</span>
                          <span className="font-bold text-slate-800">{workDetails.workDone || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-ui-xs uppercase">Material</span>
                          <span className="font-bold text-slate-800">{workDetails.materialType || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-ui-xs uppercase">Quantity Unit</span>
                          <span className="font-bold text-slate-800">
                            {workDetails.quantity ? `${workDetails.quantity} ${workDetails.quantityUnit || ''}` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Staff on OT Detailed List */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-2">
                    <p className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                      Staff Roster
                    </p>
                    {staffLines.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No individual staff lines recorded.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {staffLines.map((s, idx) => (
                          <div key={s.id || s.staffUserId || idx} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-zarewa-teal font-bold text-ui-xs">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{s.displayName || s.username || s.staffUserId}</p>
                                <p className="text-ui-xs text-slate-500">{s.roleLabel || 'Staff Member'}</p>
                              </div>
                            </div>
                            {s.startTime || s.endTime ? (
                              <div className="text-right text-ui-xs text-slate-500 flex items-center gap-1">
                                <Clock size={12} className="text-slate-400" />
                                <span>{s.startTime || '—'} – {s.endTime || '—'}</span>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Request & Approval Timeline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-1">
                      <span className="text-ui-xs font-bold uppercase tracking-wider text-slate-400 block">Requested By</span>
                      <p className="font-bold text-slate-800">{req.createdByName || '—'}</p>
                      <p className="text-ui-xs text-slate-500">Date: {req.dayIso}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-1">
                      <span className="text-ui-xs font-bold uppercase tracking-wider text-slate-400 block">Approved By</span>
                      <p className="font-bold text-slate-800">{req.approvedByName || '—'}</p>
                      <p className="text-ui-xs text-emerald-600 font-semibold">Status: Approved for payout</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </ModalScrollBody>

        {/* Sticky Action Footer */}
        <ModalScrollFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200/80 px-6 py-4 bg-slate-50/95">
          <div className="text-ui-xs text-slate-600 font-medium">
            {req ? (
              <span>
                This payout:{' '}
                <strong className="text-slate-900 tabular-nums font-bold">
                  {formatNgn(payTotalNgn)}
                </strong>
                {payTotalNgn === lockedPayable ? (
                  <span className="text-emerald-700 ml-1.5 font-bold">✓ Ready</span>
                ) : (
                  <span className="text-amber-700 ml-1.5 font-bold">
                    ({formatNgn(Math.abs(lockedPayable - payTotalNgn))} {payTotalNgn > lockedPayable ? 'over' : 'remaining'})
                  </span>
                )}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={busy}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || bankAccountsSelectOrder.length === 0 || payTotalNgn !== lockedPayable || loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-wide text-white bg-zarewa-teal hover:bg-teal-800 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Posting OT payout…</span>
                </>
              ) : (
                <span>Post OT Payout · {formatNgn(lockedPayable)}</span>
              )}
            </button>
          </div>
        </ModalScrollFooter>
      </ModalScrollShell>
    </ModalFrame>
  );
}

export default CashierOtPayModal;
