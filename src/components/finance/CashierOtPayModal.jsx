import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Plus, X } from 'lucide-react';
import { ModalFrame } from '../layout';
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

/**
 * Cashier OT payout popup — same treasury payout pattern as refunds / expenses.
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
    e.preventDefault();
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

  return (
    <ModalFrame isOpen={open} onClose={handleClose} closeDisabled={busy} title="Overtime payout" showCloseButton={false}>
      <div className="z-modal-panel z-modal-scroll-y max-w-lg p-4 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold text-zarewa-teal">
            <Banknote size={22} className="text-teal-700" />
            Overtime payout
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="rounded-xl p-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        {loading ? <p className="py-8 text-center text-xs text-slate-500">Loading OT request…</p> : null}
        {loadError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">{loadError}</p>
        ) : null}

        {!loading && req ? (
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-1 rounded-2xl border border-teal-100 bg-teal-50/80 p-4 text-sm">
              <p className="font-mono font-bold text-zarewa-teal">{req.id}</p>
              <p className="font-bold text-gray-800">
                {req.dayIso} · {req.workType}
                {req.quotationRef ? ` · ${req.quotationRef}` : ''}
                {req.poId ? ` · ${req.poId}` : ''}
              </p>
              {req.reason ? <p className="text-xs text-gray-600">{req.reason}</p> : null}
              <div className="grid grid-cols-1 gap-2 pt-1 text-ui-xs sm:grid-cols-2">
                <div>
                  <p className="font-bold uppercase tracking-wide text-gray-400">Requested by</p>
                  <p className="font-semibold text-gray-800">{req.createdByName || '—'}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wide text-gray-400">Approved by</p>
                  <p className="font-semibold text-gray-800">{req.approvedByName || '—'}</p>
                </div>
              </div>
              {detail.staffLines?.length ? (
                <div className="mt-2 rounded-xl border border-sky-200/90 bg-sky-50/95 px-3 py-2.5 text-xs text-sky-950">
                  <p className="text-ui-xs font-bold uppercase tracking-wide text-sky-900/90">Staff on OT</p>
                  <ul className="mt-1 space-y-0.5">
                    {detail.staffLines.map((s) => (
                      <li key={s.id || s.staffUserId}>
                        {s.displayName || s.username || s.staffUserId}
                        {s.roleLabel ? ` · ${s.roleLabel}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3 pt-2 text-ui-xs tabular-nums text-gray-600">
                <div>
                  <p className="uppercase text-gray-400">Locked payable</p>
                  <p className="text-sm font-black text-zarewa-teal">{formatNgn(lockedPayable)}</p>
                </div>
                <div>
                  <p className="uppercase text-gray-400">This payout</p>
                  <p className="text-sm font-black text-teal-800">{formatNgn(payTotalNgn)}</p>
                </div>
              </div>
            </div>

            {bankAccountsSelectOrder.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Add at least one treasury account before posting payout.
              </p>
            ) : (
              <>
                <div>
                  <label className="mb-1 ml-1 block text-ui-xs font-bold uppercase text-gray-400">
                    Paid by (Finance user)
                  </label>
                  <input
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    placeholder="e.g. Hauwa — cash / transfer"
                    className="z-finance-field w-full rounded-xl font-bold outline-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="ml-1 text-ui-xs font-bold uppercase text-gray-400">Payout breakdown</label>
                  <button
                    type="button"
                    onClick={addPayLine}
                    className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-ui-xs font-black uppercase tracking-wide text-zarewa-teal"
                  >
                    <Plus size={14} /> Add line
                  </button>
                </div>

                <div className="space-y-1.5">
                  {payLines.map((line) => (
                    <div
                      key={line.id}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200/60 bg-white/40 px-2.5 py-2 shadow-sm backdrop-blur-md"
                    >
                      <select
                        value={line.treasuryAccountId}
                        onChange={(e) => updatePayLine(line.id, { treasuryAccountId: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold"
                      >
                        <option value="">Select account…</option>
                        {bankAccountsSelectOrder.map((a) => (
                          <option key={a.id} value={String(a.id)}>
                            {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a, treasuryBookByAccountId))})
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={line.amount}
                          onChange={(e) => updatePayLine(line.id, { amount: e.target.value })}
                          placeholder="Amount ₦"
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold tabular-nums"
                        />
                        <input
                          type="date"
                          value={line.dateISO}
                          onChange={(e) => updatePayLine(line.id, { dateISO: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={line.reference}
                          onChange={(e) => updatePayLine(line.id, { reference: e.target.value })}
                          placeholder="Reference (optional)"
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold"
                        />
                        {payLines.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removePayLine(line.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-ui-xs font-bold uppercase text-rose-800"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="mb-1 ml-1 block text-ui-xs font-bold uppercase text-gray-400">Payment note</label>
                  <textarea
                    rows={2}
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="z-finance-field w-full rounded-xl font-semibold outline-none"
                    placeholder="Optional note for the treasury movement"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={busy || bankAccountsSelectOrder.length === 0}
              className="inline-flex w-full items-center justify-center rounded-xl bg-zarewa-teal px-4 py-3 text-ui-xs font-black uppercase tracking-wide text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {busy ? 'Posting…' : `Post OT payout · ${formatNgn(lockedPayable)}`}
            </button>
          </form>
        ) : null}
      </div>
    </ModalFrame>
  );
}

export default CashierOtPayModal;
