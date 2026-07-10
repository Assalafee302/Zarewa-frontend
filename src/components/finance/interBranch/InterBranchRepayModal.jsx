import React, { useEffect, useState } from 'react';
import { formatNgn } from '../../../Data/mockData';
import { apiFetch } from '../../../lib/apiBase';
import { interBranchStatusClass, interBranchStatusMeta } from '../../../lib/interBranchLoanUi';
import { treasuryAccountDisplayName } from '../../../lib/treasuryAccountsStore';
import { compareSelectLabels } from '../../../lib/selectOptionSort';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalScrollFooter } from '../../layout';
import { ProcurementFormSection } from '../../procurement/ProcurementFormSection';

const INPUT = 'z-finance-field';

/**
 * @param {{
 *   loan: object;
 *   branchNameById: Record<string, string>;
 *   treasuryAccounts: object[];
 *   onClose: () => void;
 *   onSaved: () => void;
 * }} props
 */
export function InterBranchRepayModal({ loan, branchNameById, treasuryAccounts, onClose, onSaved }) {
  const [form, setForm] = useState({
    amountNgn: '',
    dateISO: new Date().toISOString().slice(0, 10),
    fromTreasuryAccountId: '',
    toTreasuryAccountId: '',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const borrowerBranchId = String(loan?.borrowerBranchId || '').trim();
  const lenderBranchId = String(loan?.lenderBranchId || '').trim();

  const fromAccounts = treasuryAccounts
    .filter((a) => String(a.branchId || '') === borrowerBranchId)
    .sort((a, b) => compareSelectLabels(treasuryAccountDisplayName(a), treasuryAccountDisplayName(b)));
  const toAccounts = treasuryAccounts
    .filter((a) => String(a.branchId || '') === lenderBranchId)
    .sort((a, b) => compareSelectLabels(treasuryAccountDisplayName(a), treasuryAccountDisplayName(b)));

  useEffect(() => {
    setForm((f) => ({
      ...f,
      amountNgn: String(loan?.outstandingNgn || ''),
      fromTreasuryAccountId: fromAccounts[0] ? String(fromAccounts[0].id) : '',
      toTreasuryAccountId: toAccounts[0] ? String(toAccounts[0].id) : '',
    }));
  }, [loan?.loanId, loan?.outstandingNgn, fromAccounts, toAccounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amountNgn = Math.round(Number(form.amountNgn) || 0);
    const fromTa = Number(form.fromTreasuryAccountId);
    const toTa = Number(form.toTreasuryAccountId);
    if (amountNgn <= 0) {
      setError('Repayment amount must be greater than zero.');
      return;
    }
    if (!fromTa || !toTa || fromTa === toTa) {
      setError('Choose two different treasury accounts.');
      return;
    }
    if (amountNgn > (loan?.outstandingNgn || 0)) {
      setError('Amount exceeds outstanding balance.');
      return;
    }

    setBusy(true);
    const { ok, data } = await apiFetch(
      `/api/inter-branch-loans/${encodeURIComponent(loan.loanId)}/repay`,
      {
        method: 'POST',
        body: JSON.stringify({
          amountNgn,
          dateISO: form.dateISO,
          fromTreasuryAccountId: fromTa,
          toTreasuryAccountId: toTa,
          note: form.note.trim(),
        }),
      }
    );
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not post repayment.');
      return;
    }
    onSaved();
  };

  return (
    <ModalFrame isOpen onClose={onClose} title="Record repayment" surface="plain">
      <ModalScrollShell size="md">
        <div className="h-1 shrink-0 bg-zarewa-teal" />
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <ModalScrollBody className="space-y-4">
            <div>
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Loan</p>
              <p className="font-mono text-sm font-bold text-zarewa-teal">{loan.loanId}</p>
              <p className="text-xs text-slate-600 mt-1">
                {branchNameById[borrowerBranchId] || borrowerBranchId} repays{' '}
                {branchNameById[lenderBranchId] || lenderBranchId}
              </p>
              <p className="text-xs text-slate-500 mt-1 tabular-nums">
                Outstanding: {formatNgn(loan.outstandingNgn)}
              </p>
            </div>

            <ProcurementFormSection letter="1" title="Treasury movement" compact>
              <div className="grid grid-cols-1 gap-3">
                <label className="block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                  From account (borrower branch) *
                  <select
                    className={INPUT}
                    value={form.fromTreasuryAccountId}
                    onChange={(e) => setForm((f) => ({ ...f, fromTreasuryAccountId: e.target.value }))}
                    required
                  >
                    <option value="">Select…</option>
                    {fromAccounts.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {treasuryAccountDisplayName(a)} · {formatNgn(a.balance)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                  To account (lender branch) *
                  <select
                    className={INPUT}
                    value={form.toTreasuryAccountId}
                    onChange={(e) => setForm((f) => ({ ...f, toTreasuryAccountId: e.target.value }))}
                    required
                  >
                    <option value="">Select…</option>
                    {toAccounts.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {treasuryAccountDisplayName(a)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                    Amount (₦) *
                    <input
                      type="number"
                      min="1"
                      max={loan.outstandingNgn}
                      className={INPUT}
                      value={form.amountNgn}
                      onChange={(e) => setForm((f) => ({ ...f, amountNgn: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                    Payment date *
                    <input
                      type="date"
                      className={INPUT}
                      value={form.dateISO}
                      onChange={(e) => setForm((f) => ({ ...f, dateISO: e.target.value }))}
                      required
                    />
                  </label>
                </div>
                <label className="block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                  Note
                  <input
                    className={INPUT}
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Repayment reference or bank narration"
                  />
                </label>
              </div>
            </ProcurementFormSection>

            {error ? <p className="text-ui-xs font-medium text-rose-700">{error}</p> : null}
          </ModalScrollBody>

          <ModalScrollFooter className="flex justify-end gap-2">
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
              disabled={busy}
              className="min-h-11 rounded-lg bg-zarewa-teal text-white px-4 py-2 text-ui-xs font-semibold uppercase disabled:opacity-50 sm:min-h-0 sm:py-1.5 sm:text-ui-xs"
            >
              {busy ? 'Posting…' : 'Post repayment'}
            </button>
          </ModalScrollFooter>
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}

export function InterBranchStatusBadge({ status }) {
  const meta = interBranchStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-ui-xs font-bold uppercase tracking-wide ${interBranchStatusClass(meta.tone)}`}
    >
      {meta.label}
    </span>
  );
}
