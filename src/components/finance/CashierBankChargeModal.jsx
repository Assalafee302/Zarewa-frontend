import React, { useEffect, useMemo, useState } from 'react';
import { Landmark } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { ModalFrame, ModalScrollShell, ModalScrollHeader, ModalScrollBody, ModalActionFooter } from '../layout';
import { FieldLabel } from '../ui/Input';
import { treasuryAccountDisplayName, treasuryAccountsForWorkspace } from '../../lib/treasuryAccountsStore';
import { compareSelectLabels } from '../../lib/selectOptionSort';
import {
  treasuryBookBalanceByAccountId,
  treasuryBookDisplayNgn,
} from '../../lib/financeDeskTreasury';
import { BANK_CHARGE_KINDS, postBankCharge } from '../../lib/bankChargesApi';

const FIELD = 'z-finance-field';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(accountId = '') {
  return {
    dateISO: todayIso(),
    amountNgn: '',
    treasuryAccountId: accountId,
    chargeKind: 'cot',
    description: '',
    reference: '',
  };
}

/**
 * Cashier popup — record bank charges already taken from a till or bank account.
 */
export function CashierBankChargeModal({ open, onClose, initialAccountId = '' }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [form, setForm] = useState(() => emptyForm(initialAccountId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const treasuryMovements = useMemo(
    () => (Array.isArray(ws?.snapshot?.treasuryMovements) ? ws.snapshot.treasuryMovements : []),
    [ws?.snapshot?.treasuryMovements]
  );
  const treasuryAccounts = useMemo(
    () =>
      treasuryAccountsForWorkspace(ws?.snapshot, ws?.session, {
        branchScope: ws?.branchScope,
        viewAllBranches: ws?.viewAllBranches,
      }),
    [ws?.snapshot, ws?.session, ws?.branchScope, ws?.viewAllBranches]
  );
  const bookById = useMemo(
    () => treasuryBookBalanceByAccountId(treasuryAccounts, treasuryMovements),
    [treasuryAccounts, treasuryMovements]
  );
  const accountsOrdered = useMemo(() => {
    const bankFirst = [...treasuryAccounts].sort((a, b) => {
      const typeCmp = String(a.type || '').localeCompare(String(b.type || ''));
      if (typeCmp !== 0) {
        if (String(a.type) === 'Bank') return -1;
        if (String(b.type) === 'Bank') return 1;
      }
      return compareSelectLabels(treasuryAccountDisplayName(a), treasuryAccountDisplayName(b));
    });
    return bankFirst;
  }, [treasuryAccounts]);

  const defaultAccountId = useMemo(() => {
    const fromProp = String(initialAccountId || '').trim();
    if (fromProp && accountsOrdered.some((a) => String(a.id) === fromProp)) return fromProp;
    const firstBank = accountsOrdered.find((a) => String(a.type) === 'Bank');
    return firstBank ? String(firstBank.id) : accountsOrdered[0] ? String(accountsOrdered[0].id) : '';
  }, [accountsOrdered, initialAccountId]);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(defaultAccountId));
    setError('');
    setBusy(false);
  }, [open, defaultAccountId]);

  const selectedAccount = accountsOrdered.find((a) => String(a.id) === String(form.treasuryAccountId));
  const bookNgn = selectedAccount ? treasuryBookDisplayNgn(selectedAccount, bookById) : 0;
  const amountNgn = Math.round(Number(form.amountNgn) || 0);
  const kindLabel = BANK_CHARGE_KINDS.find((k) => k.id === form.chargeKind)?.label || 'Bank charges';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.treasuryAccountId) {
      setError('Select the bank or cash account the charge was taken from.');
      return;
    }
    if (amountNgn <= 0) {
      setError('Enter the charge amount.');
      return;
    }
    if (!form.dateISO) {
      setError('Enter the charge date.');
      return;
    }
    if (!ws?.canMutate) {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to record bank charges — workspace is read-only.'
          : 'Connect to the API to record bank charges.',
        { variant: 'info' }
      );
      return;
    }

    const description = String(form.description || '').trim() || kindLabel;
    setBusy(true);
    const { ok, data } = await postBankCharge({
      treasuryAccountId: form.treasuryAccountId,
      amountNgn,
      dateISO: form.dateISO,
      description,
      reference: form.reference,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not record bank charge.');
      return;
    }
    await ws?.refresh?.();
    showToast(`Bank charge ${formatNgn(amountNgn)} posted from ${treasuryAccountDisplayName(selectedAccount)}.`);
    onClose?.();
  };

  return (
    <ModalFrame
      isOpen={open}
      onClose={() => {
        if (busy) return;
        onClose?.();
      }}
      title="Record bank charge"
      description="Date, amount, and which account the bank deducted from."
      surface="plain"
      closeDisabled={busy}
    >
      <ModalScrollShell size="md">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ModalScrollHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-teal-50 p-2 text-zarewa-teal">
                <Landmark size={20} aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zarewa-teal">Record bank charge</h3>
                <p className="mt-1 text-xs leading-snug text-slate-500">
                  Use this when the bank has already taken COT, stamp duty, or a transfer fee. It posts like an expense
                  payout from the selected account — no Branch Manager request.
                </p>
              </div>
            </div>
          </ModalScrollHeader>
          <ModalScrollBody className="space-y-4">
            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">{error}</p>
            ) : null}
            {accountsOrdered.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Add a treasury account first, then record the charge.
              </p>
            ) : (
              <>
                <div>
                  <FieldLabel htmlFor="bank-charge-date" required>
                    Date
                  </FieldLabel>
                  <input
                    id="bank-charge-date"
                    required
                    type="date"
                    value={form.dateISO}
                    onChange={(e) => setForm((f) => ({ ...f, dateISO: e.target.value }))}
                    className={`mt-1 w-full rounded-xl font-semibold ${FIELD}`}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="bank-charge-amount" required>
                    Amount (₦)
                  </FieldLabel>
                  <input
                    id="bank-charge-amount"
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.amountNgn}
                    onChange={(e) => setForm((f) => ({ ...f, amountNgn: e.target.value }))}
                    className={`mt-1 w-full rounded-xl font-bold text-zarewa-teal ${FIELD}`}
                    placeholder="0"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="bank-charge-account" required>
                    Which account
                  </FieldLabel>
                  <select
                    id="bank-charge-account"
                    required
                    value={form.treasuryAccountId}
                    onChange={(e) => setForm((f) => ({ ...f, treasuryAccountId: e.target.value }))}
                    className={`mt-1 w-full rounded-xl font-bold ${FIELD}`}
                  >
                    <option value="">Select account…</option>
                    {accountsOrdered.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a, bookById))})
                      </option>
                    ))}
                  </select>
                  {selectedAccount ? (
                    <p className="mt-1 text-ui-xs text-slate-500">
                      Book balance {formatNgn(bookNgn)}
                      {selectedAccount.accNo ? ` · ${selectedAccount.accNo}` : ''}
                    </p>
                  ) : null}
                </div>
                <div>
                  <FieldLabel htmlFor="bank-charge-kind">Charge type</FieldLabel>
                  <select
                    id="bank-charge-kind"
                    value={form.chargeKind}
                    onChange={(e) => setForm((f) => ({ ...f, chargeKind: e.target.value }))}
                    className={`mt-1 w-full rounded-xl font-semibold ${FIELD}`}
                  >
                    {BANK_CHARGE_KINDS.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="bank-charge-desc">Description</FieldLabel>
                  <input
                    id="bank-charge-desc"
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className={`mt-1 w-full rounded-xl font-semibold ${FIELD}`}
                    placeholder={kindLabel}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="bank-charge-ref">Bank reference</FieldLabel>
                  <input
                    id="bank-charge-ref"
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                    className={`mt-1 w-full rounded-xl font-semibold ${FIELD}`}
                    placeholder="Statement / narration (optional)"
                  />
                </div>
              </>
            )}
          </ModalScrollBody>
          <ModalActionFooter
            onCancel={() => {
              if (busy) return;
              onClose?.();
            }}
            cancelDisabled={busy}
            confirmType="submit"
            confirmLabel={amountNgn > 0 ? `Post ${formatNgn(amountNgn)}` : 'Post bank charge'}
            confirmLoading={busy}
            confirmLoadingLabel="Posting…"
            confirmDisabled={busy || accountsOrdered.length === 0}
          />
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}
