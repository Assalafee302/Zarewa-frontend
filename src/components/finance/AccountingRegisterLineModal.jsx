import React, { useState } from 'react';
import { useAccountingRegisterMutations } from '../../hooks/useAccountingSubledger';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ModalFrame } from '../layout/ModalFrame';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';

const CATEGORIES = {
  creditor: [
    { value: 'legacy', label: 'General inherited receivable' },
    { value: 'staff_loan', label: 'Staff loan (pre-system)' },
    { value: 'customer_ar', label: 'Customer receivable (pre-system)' },
    { value: 'supplier_prepay', label: 'Supplier prepayment (pre-system)' },
    { value: 'inter_branch', label: 'Inter-branch receivable' },
  ],
  debtor: [
    { value: 'legacy', label: 'General inherited payable' },
    { value: 'project_overpayment', label: 'Project overpayment (refundable)' },
    { value: 'customer_deposit', label: 'Customer deposit (pre-system)' },
    { value: 'supplier_ap', label: 'Supplier payable (pre-system)' },
    { value: 'inter_branch', label: 'Inter-branch payable' },
  ],
};

const INPUT =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 outline-none transition-all focus:border-[#134e4a]/35 focus:ring-2 focus:ring-[#134e4a]/10 shadow-sm';

/**
 * @param {{
 *   registerSide: 'creditor' | 'debtor';
 *   branchId?: string | null;
 *   initialValues?: object | null;
 *   editLine?: object | null;
 *   onClose: () => void;
 *   onSaved: () => void;
 * }} props
 */
export function AccountingRegisterLineModal({
  registerSide,
  branchId,
  initialValues = null,
  editLine = null,
  onClose,
  onSaved,
}) {
  const ws = useWorkspace();
  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
  const seed = editLine || initialValues || {};
  const defaultBranch =
    seed.branchId || (branchId && branchId !== 'ALL' ? branchId : branches[0]?.id || '');

  const isEdit = Boolean(editLine?.id);
  const sideNoun = registerSide === 'creditor' ? 'receivable' : 'payable';

  const [partyName, setPartyName] = useState(seed.partyName || '');
  const [partyRef, setPartyRef] = useState(seed.partyRef || '');
  const [amountNgn, setAmountNgn] = useState(seed.amountNgn != null ? String(seed.amountNgn) : '');
  const [asAtDateIso, setAsAtDateIso] = useState(seed.asAtDateIso || '');
  const [category, setCategory] = useState(seed.category || CATEGORIES[registerSide][0].value);
  const [description, setDescription] = useState(seed.description || seed.detail || '');
  const [reference, setReference] = useState(seed.reference || '');
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  const [notes, setNotes] = useState(seed.notes || '');

  const { busy, error, createLine, updateLine } = useAccountingRegisterMutations();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      registerSide,
      partyName: partyName.trim(),
      partyRef: partyRef.trim() || undefined,
      amountNgn: Math.round(Number(amountNgn) || 0),
      asAtDateIso,
      category,
      description: description.trim() || undefined,
      reference: reference.trim() || undefined,
      branchId: selectedBranch || undefined,
      source: 'legacy',
      notes: notes.trim() || undefined,
    };

    const result = isEdit
      ? await updateLine(editLine.id, payload)
      : await createLine(payload);
    if (result.ok) onSaved();
  };

  return (
    <ModalFrame
      isOpen
      onClose={onClose}
      title={isEdit ? `Edit inherited ${sideNoun}` : `Add inherited ${sideNoun}`}
      surface="plain"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden">
        <div className="h-1 bg-[#134e4a]" />
        <div className="p-5 sm:p-6 max-h-[min(85dvh,720px)] overflow-y-auto custom-scrollbar">
          <h2 className="text-lg font-bold text-[#134e4a]">
            {isEdit ? 'Edit inherited' : 'Add inherited'} {sideNoun}
          </h2>
          <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
            {isEdit
              ? 'Update party, amount, or reference for this open legacy line.'
              : 'For balances from before go-live or not captured in live transactions (e.g. April project overpayment).'}
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <ProcurementFormSection letter="1" title="Party & category" compact>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Party name *
                  <input
                    className={INPUT}
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    required
                    placeholder="Customer / staff / supplier name"
                  />
                </label>
                <label className="sm:col-span-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Category
                  <select className={INPUT} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES[registerSide].map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Party ref (optional)
                  <input
                    className={INPUT}
                    value={partyRef}
                    onChange={(e) => setPartyRef(e.target.value)}
                    placeholder="CUS-… / USR-… / SUP-…"
                  />
                </label>
                {branches.length ? (
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Branch
                    <select
                      className={INPUT}
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                    >
                      {branches.map((b) => (
                        <option key={b.id || b.branchId} value={b.id || b.branchId}>
                          {b.name || b.label || b.id}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </ProcurementFormSection>

            <ProcurementFormSection letter="2" title="Amount & date" compact>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Amount (₦) *
                  <input
                    type="number"
                    min="1"
                    className={INPUT}
                    value={amountNgn}
                    onChange={(e) => setAmountNgn(e.target.value)}
                    required
                    placeholder="8000000"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  As-at date *
                  <input
                    type="date"
                    className={INPUT}
                    value={asAtDateIso}
                    onChange={(e) => setAsAtDateIso(e.target.value)}
                    required
                  />
                </label>
              </div>
            </ProcurementFormSection>

            <ProcurementFormSection letter="3" title="Reference & notes" compact>
              <div className="space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Reference / quote / PO
                  <input
                    className={INPUT}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="QT-KD-26-0001 or project name"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Description
                  <textarea
                    className={INPUT}
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="April roofing project — overpayment to withdraw"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Notes (internal)
                  <textarea className={INPUT} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
              </div>
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
                {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Save line'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalFrame>
  );
}
