import React, { useCallback, useEffect, useState } from 'react';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalScrollFooter } from '../layout';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import { formatNgn } from '../../Data/mockData';
import { useRegisterSettlementMutations } from '../../hooks/useAccountingRegisterSettlements';

function blockingLabel(item) {
  const reserved = item.reservedNgn ?? item.amountNgn ?? 0;
  if (item.status === 'Approved') {
    const out = Math.max(0, (item.approvedAmountNgn || item.amountNgn || 0) - (item.paidAmountNgn || 0));
    return `${item.settlementId} · Approved · ${formatNgn(out)} unpaid`;
  }
  return `${item.settlementId} · Pending · ${formatNgn(reserved)} reserved`;
}

/**
 * @param {{ item: object; open: boolean; onClose: () => void; onSaved: () => void }} props
 */
export function AccountingRegisterSettlementRequestModal({ item, open, onClose, onSaved }) {
  const { busy, error, fetchAvailable, createSettlement } = useRegisterSettlementMutations();
  const [capacityState, setCapacityState] = useState('loading');
  const [openNgn, setOpenNgn] = useState(0);
  const [availableNgn, setAvailableNgn] = useState(0);
  const [reservedNgn, setReservedNgn] = useState(0);
  const [blockedReason, setBlockedReason] = useState('');
  const [blockingItems, setBlockingItems] = useState([]);
  const [amountNgn, setAmountNgn] = useState('');
  const [reason, setReason] = useState('');
  const [payeeName, setPayeeName] = useState(item?.partyName || '');
  const [payeeBankDetails, setPayeeBankDetails] = useState('');
  const [validationError, setValidationError] = useState('');
  const [capacityError, setCapacityError] = useState('');

  const loadCapacity = useCallback(async () => {
    if (!item?.id) return;
    setCapacityState('loading');
    setValidationError('');
    setCapacityError('');
    const r = await fetchAvailable(item.id);
    if (!r.ok) {
      setCapacityState('error');
      setOpenNgn(item.amountNgn ?? 0);
      setAvailableNgn(0);
      setReservedNgn(0);
      setBlockingItems([]);
      setBlockedReason('');
      setAmountNgn('');
      setCapacityError(r.error || 'Could not load settlement capacity for this line.');
      return;
    }
    setCapacityState('ok');
    const open = r.openNgn ?? item.amountNgn ?? 0;
    const avail = r.availableNgn ?? 0;
    setOpenNgn(open);
    setAvailableNgn(avail);
    setReservedNgn(r.reservedNgn ?? Math.max(0, open - avail));
    setBlockingItems(r.blockingItems || []);
    setBlockedReason(r.blockedReason || '');
    setAmountNgn(avail > 0 ? String(avail) : '');
  }, [item, fetchAvailable]);

  useEffect(() => {
    if (!open || !item?.id) return;
    setPayeeName(item.partyName || '');
    setReason(item.description || item.detail || '');
    void loadCapacity();
  }, [open, item, loadCapacity]);

  if (!open || !item) return null;

  const canRequest = capacityState === 'ok' && availableNgn > 0;
  const showReservedNotice = capacityState === 'ok' && !canRequest && (reservedNgn > 0 || blockingItems.length > 0);
  const displayOpen = capacityState === 'ok' ? openNgn : item.amountNgn ?? 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    if (capacityState === 'error') {
      setValidationError(capacityError || 'Could not verify available balance. Retry loading capacity first.');
      return;
    }
    if (!canRequest) {
      setValidationError(
        blockedReason ||
          'Nothing is available to request on this line right now. Clear any pending or approved unpaid withdrawals first.'
      );
      return;
    }
    const amt = Math.round(Number(amountNgn) || 0);
    if (amt <= 0) {
      setValidationError('Enter an amount greater than zero.');
      return;
    }
    if (amt > availableNgn) {
      setValidationError(`Amount exceeds available balance (${formatNgn(availableNgn)}).`);
      return;
    }
    const result = await createSettlement(item.id, {
      amountNgn: amt,
      reason: reason.trim(),
      payeeName: payeeName.trim(),
      payeeBankDetails: payeeBankDetails.trim() || undefined,
      branchId: item.branchId || undefined,
    });
    if (result.ok) onSaved();
  };

  return (
    <ModalFrame isOpen={open} onClose={onClose} title="Request withdrawal" surface="plain">
      <ModalScrollShell size="md">
        <div className="h-1 shrink-0 bg-zarewa-teal" />
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <ModalScrollBody className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-zarewa-teal">Request register withdrawal</h2>
              <p className="mt-1 text-ui-xs text-slate-500 leading-relaxed sm:text-xs">
                {item.partyName} · Open balance {formatNgn(displayOpen)}
                {capacityState === 'ok' ? (
                  <>
                    {' '}
                    · Reserved {formatNgn(reservedNgn)} · Available to request {formatNgn(availableNgn)}
                  </>
                ) : capacityState === 'loading' ? (
                  <> · Checking available balance…</>
                ) : null}
              </p>
            </div>

            {capacityState === 'error' ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-950 leading-relaxed space-y-2">
                <p className="font-semibold">Could not load withdrawal capacity</p>
                <p>{capacityError}</p>
                <p className="text-ui-xs text-rose-900/90">
                  This is a system/read error — not proof that balance is reserved. After backend restart, retry below.
                  If you use <span className="font-bold">All branches</span> view, ensure that mode is enabled for your role.
                </p>
                <button
                  type="button"
                  onClick={() => void loadCapacity()}
                  className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wider text-rose-900"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {showReservedNotice ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950 leading-relaxed space-y-2">
                <p>
                  {formatNgn(reservedNgn)} is reserved by pending or approved unpaid withdrawals on this line. Clear
                  them before submitting a new request.
                </p>
                {blockingItems.length ? (
                  <div>
                    <p className="text-ui-xs font-bold uppercase tracking-wide text-amber-900">Blocking requests</p>
                    <ul className="mt-1.5 space-y-1">
                      {blockingItems.map((s) => (
                        <li
                          key={s.settlementId}
                          className="rounded-md border border-amber-200/80 bg-white/70 px-2.5 py-1.5 text-ui-xs font-medium text-amber-950"
                        >
                          {blockingLabel(s)}
                          {s.reason ? (
                            <span className="block text-ui-xs font-normal text-amber-900/80 mt-0.5">{s.reason}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    <p className="text-ui-xs text-amber-900/90 mt-2">
                      On the register line detail, use <span className="font-bold">Withdraw</span> on your pending
                      request, or ask MD/finance to approve/reject. Approved requests must be paid from treasury.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {capacityState === 'ok' && !canRequest && !showReservedNotice && blockedReason ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                {blockedReason}
              </div>
            ) : null}

            <ProcurementFormSection letter="1" title="Withdrawal" compact>
              <label className="block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                Amount (₦) *
                <input
                  type="number"
                  {...(canRequest ? { min: 1, max: availableNgn } : {})}
                  className="z-finance-field disabled:opacity-60"
                  value={amountNgn}
                  onChange={(e) => setAmountNgn(e.target.value)}
                  disabled={!canRequest}
                  required={canRequest}
                />
              </label>
              <label className="block text-ui-xs font-bold uppercase tracking-wide text-slate-500 mt-3">
                Reason *
                <textarea
                  className="z-finance-field font-medium"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={canRequest || capacityState !== 'error'}
                />
              </label>
            </ProcurementFormSection>
            <ProcurementFormSection letter="2" title="Payee" compact>
              <label className="block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                Payee name *
                <input className="z-finance-field" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} required />
              </label>
              <label className="block text-ui-xs font-bold uppercase tracking-wide text-slate-500 mt-3">
                Bank details
                <textarea
                  className="z-finance-field font-medium"
                  rows={2}
                  value={payeeBankDetails}
                  onChange={(e) => setPayeeBankDetails(e.target.value)}
                  placeholder="Bank, account name, account number"
                />
              </label>
            </ProcurementFormSection>
            {validationError ? <p className="text-ui-xs font-medium text-rose-700">{validationError}</p> : null}
            {error ? <p className="text-ui-xs font-medium text-rose-700">{error}</p> : null}
            <p className="text-ui-xs text-slate-500">
              After submit: MD or finance approves → Cashier pays from treasury → Debtors line reduces automatically.
            </p>
          </ModalScrollBody>
          <ModalScrollFooter className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-ui-xs font-semibold uppercase text-slate-700 sm:min-h-0 sm:py-1.5 sm:text-ui-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !canRequest}
              className="min-h-11 rounded-lg bg-zarewa-teal text-white px-4 py-2 text-ui-xs font-semibold uppercase disabled:opacity-50 sm:min-h-0 sm:py-1.5 sm:text-ui-xs"
            >
              {busy ? 'Submitting…' : 'Submit for approval'}
            </button>
          </ModalScrollFooter>
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}
