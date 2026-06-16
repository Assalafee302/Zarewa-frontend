import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { apiFetch } from '../../lib/apiBase';
import {
  emptyProposeForm,
  emptyRepaymentPlanRow,
  sumRepaymentPlanNgn,
} from '../../lib/interBranchLoanUi';
import {
  treasuryAccountDisplayName,
  treasuryAccountsFromSnapshot,
} from '../../lib/treasuryAccountsStore';
import { compareSelectLabels } from '../../lib/selectOptionSort';
import { ModalFrame } from '../layout/ModalFrame';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';

const INPUT =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 outline-none transition-all focus:border-[#134e4a]/35 focus:ring-2 focus:ring-[#134e4a]/10 shadow-sm';

/**
 * @param {{
 *   branches: object[];
 *   treasuryAccounts: object[];
 *   workspaceBranchId?: string;
 *   onClose: () => void;
 *   onSaved: () => void;
 * }} props
 */
export function InterBranchProposeModal({
  branches,
  treasuryAccounts,
  workspaceBranchId = '',
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(() => emptyProposeForm(workspaceBranchId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const branchOptions = useMemo(
    () =>
      [...branches].sort((a, b) =>
        compareSelectLabels(a.name || a.code || a.id, b.name || b.code || b.id)
      ),
    [branches]
  );

  const lenderAccounts = useMemo(() => {
    const bid = String(form.lenderBranchId || '').trim();
    const list = treasuryAccounts.filter((a) => !bid || String(a.branchId || '') === bid);
    return [...list].sort((a, b) =>
      compareSelectLabels(treasuryAccountDisplayName(a), treasuryAccountDisplayName(b))
    );
  }, [treasuryAccounts, form.lenderBranchId]);

  const borrowerAccounts = useMemo(() => {
    const bid = String(form.borrowerBranchId || '').trim();
    const list = treasuryAccounts.filter((a) => !bid || String(a.branchId || '') === bid);
    return [...list].sort((a, b) =>
      compareSelectLabels(treasuryAccountDisplayName(a), treasuryAccountDisplayName(b))
    );
  }, [treasuryAccounts, form.borrowerBranchId]);

  const planTotal = sumRepaymentPlanNgn(
    form.repaymentPlan.map((r) => ({ amountNgn: Number(r.amountNgn) || 0 }))
  );
  const principal = Math.round(Number(form.principalNgn) || 0);

  const updatePlanRow = (idx, patch) => {
    setForm((f) => ({
      ...f,
      repaymentPlan: f.repaymentPlan.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.lenderBranchId || !form.borrowerBranchId || form.lenderBranchId === form.borrowerBranchId) {
      setError('Choose two different branches.');
      return;
    }
    const fromTa = Number(form.fromTreasuryAccountId);
    const toTa = Number(form.toTreasuryAccountId);
    if (!fromTa || !toTa || fromTa === toTa) {
      setError('Choose two different treasury accounts.');
      return;
    }
    if (principal <= 0) {
      setError('Principal must be greater than zero.');
      return;
    }
    const repaymentPlan = form.repaymentPlan
      .map((row) => ({
        dueDateISO: String(row.dueDateISO || '').slice(0, 10),
        amountNgn: Math.round(Number(row.amountNgn) || 0),
        note: String(row.note || '').trim() || undefined,
      }))
      .filter((row) => row.dueDateISO && row.amountNgn > 0);

    setBusy(true);
    const { ok, data } = await apiFetch('/api/inter-branch-loans', {
      method: 'POST',
      body: JSON.stringify({
        lenderBranchId: form.lenderBranchId,
        borrowerBranchId: form.borrowerBranchId,
        fromTreasuryAccountId: fromTa,
        toTreasuryAccountId: toTa,
        principalNgn: principal,
        dateISO: form.dateISO,
        reference: form.reference.trim(),
        proposedNote: form.proposedNote.trim(),
        repaymentPlan,
      }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not propose transfer.');
      return;
    }
    onSaved();
  };

  return (
    <ModalFrame isOpen onClose={onClose} title="Propose inter-branch transfer" surface="plain">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden">
        <div className="h-1 bg-[#134e4a]" />
        <div className="p-5 sm:p-6 max-h-[min(85dvh,760px)] overflow-y-auto custom-scrollbar">
          <h2 className="text-lg font-bold text-[#134e4a]">Propose inter-branch transfer</h2>
          <p className="mt-1 text-[10px] text-slate-500 leading-relaxed max-w-xl">
            Treasury moves from the lending branch to the borrowing branch. Funds post only after MD approval.
            Repayment instalments are tracked for accounting — treasury repayments reduce the outstanding balance.
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <ProcurementFormSection letter="1" title="Branches" compact>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Lending branch *
                  <select
                    className={INPUT}
                    value={form.lenderBranchId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        lenderBranchId: e.target.value,
                        fromTreasuryAccountId: '',
                      }))
                    }
                    required
                  >
                    <option value="">Select branch…</option>
                    {branchOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.code || b.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Borrowing branch *
                  <select
                    className={INPUT}
                    value={form.borrowerBranchId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        borrowerBranchId: e.target.value,
                        toTreasuryAccountId: '',
                      }))
                    }
                    required
                  >
                    <option value="">Select branch…</option>
                    {branchOptions
                      .filter((b) => b.id !== form.lenderBranchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name || b.code || b.id}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </ProcurementFormSection>

            <ProcurementFormSection letter="2" title="Treasury accounts" compact>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Debit (lender) account *
                  <select
                    className={INPUT}
                    value={form.fromTreasuryAccountId}
                    onChange={(e) => setForm((f) => ({ ...f, fromTreasuryAccountId: e.target.value }))}
                    required
                  >
                    <option value="">Select account…</option>
                    {lenderAccounts.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {treasuryAccountDisplayName(a)} · {formatNgn(a.balance)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Credit (borrower) account *
                  <select
                    className={INPUT}
                    value={form.toTreasuryAccountId}
                    onChange={(e) => setForm((f) => ({ ...f, toTreasuryAccountId: e.target.value }))}
                    required
                  >
                    <option value="">Select account…</option>
                    {borrowerAccounts.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {treasuryAccountDisplayName(a)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </ProcurementFormSection>

            <ProcurementFormSection letter="3" title="Amount & reference" compact>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Principal (₦) *
                  <input
                    type="number"
                    min="1"
                    className={INPUT}
                    value={form.principalNgn}
                    onChange={(e) => setForm((f) => ({ ...f, principalNgn: e.target.value }))}
                    required
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Proposed disbursement date *
                  <input
                    type="date"
                    className={INPUT}
                    value={form.dateISO}
                    onChange={(e) => setForm((f) => ({ ...f, dateISO: e.target.value }))}
                    required
                  />
                </label>
                <label className="sm:col-span-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Reference
                  <input
                    className={INPUT}
                    value={form.reference}
                    onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                    placeholder="IBT-2026-04 working capital"
                  />
                </label>
                <label className="sm:col-span-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Business rationale
                  <textarea
                    className={INPUT}
                    rows={2}
                    value={form.proposedNote}
                    onChange={(e) => setForm((f) => ({ ...f, proposedNote: e.target.value }))}
                    placeholder="Why this branch needs funding and how it will be recovered"
                  />
                </label>
              </div>
            </ProcurementFormSection>

            <ProcurementFormSection letter="4" title="Repayment schedule (optional)" compact>
              <p className="text-[10px] text-slate-500 mb-2">
                Planned instalments for the debtors/creditors register — actual treasury repayments are posted
                separately after disbursement.
                {principal > 0 && planTotal > 0 ? (
                  <span className="block mt-1 tabular-nums">
                    Plan total: {formatNgn(planTotal)}
                    {planTotal !== principal ? (
                      <span className="text-amber-700"> · differs from principal</span>
                    ) : null}
                  </span>
                ) : null}
              </p>
              <div className="space-y-2">
                {form.repaymentPlan.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <label className="col-span-4 text-[9px] font-bold uppercase text-slate-500">
                      Due date
                      <input
                        type="date"
                        className={INPUT}
                        value={row.dueDateISO}
                        onChange={(e) => updatePlanRow(idx, { dueDateISO: e.target.value })}
                      />
                    </label>
                    <label className="col-span-3 text-[9px] font-bold uppercase text-slate-500">
                      Amount (₦)
                      <input
                        type="number"
                        min="0"
                        className={INPUT}
                        value={row.amountNgn}
                        onChange={(e) => updatePlanRow(idx, { amountNgn: e.target.value })}
                      />
                    </label>
                    <label className="col-span-4 text-[9px] font-bold uppercase text-slate-500">
                      Note
                      <input
                        className={INPUT}
                        value={row.note}
                        onChange={(e) => updatePlanRow(idx, { note: e.target.value })}
                        placeholder="Instalment"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={form.repaymentPlan.length <= 1}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          repaymentPlan: f.repaymentPlan.filter((_, i) => i !== idx),
                        }))
                      }
                      className="col-span-1 mb-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      aria-label="Remove instalment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    repaymentPlan: [...f.repaymentPlan, emptyRepaymentPlanRow()],
                  }))
                }
                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a]"
              >
                <Plus size={12} /> Add instalment
              </button>
            </ProcurementFormSection>

            {error ? <p className="text-[10px] font-medium text-rose-700">{error}</p> : null}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider disabled:opacity-50"
              >
                {busy ? 'Submitting…' : 'Submit for MD approval'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalFrame>
  );
}

/** @param {{ snapshot?: object | null }} opts */
export function treasuryAccountsAllBranches(opts = {}) {
  return treasuryAccountsFromSnapshot(opts.snapshot);
}
