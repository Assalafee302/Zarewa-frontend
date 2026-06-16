import React, { useMemo, useState } from 'react';
import { useAccountingRegisterMutations } from '../../hooks/useAccountingSubledger';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { useCustomers } from '../../context/CustomersContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import {
  registerPartyFieldLabel,
  registerPartyKindForCategory,
} from '../../lib/accountingRegisterPartyConfig';
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

function branchOptionId(branch) {
  return String(branch?.id || branch?.branchId || '').trim();
}

function branchOptionLabel(branch) {
  return branch?.name || branch?.label || branchOptionId(branch) || '—';
}

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
  const { customers } = useCustomers();
  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
  const suppliers = useMemo(() => {
    const list = Array.isArray(ws?.snapshot?.suppliers) ? ws.snapshot.suppliers : [];
    return [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
  }, [ws?.snapshot?.suppliers]);

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
  const [staff, setStaff] = useState([]);

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff?includeInactive=1');
    if (!ok || !data?.ok) {
      setStaff([]);
      return { hasData: false };
    }
    setStaff(data.staff || []);
    return { hasData: true };
  }, []);

  const partyKind = registerPartyKindForCategory(category);
  const partyFieldLabel = registerPartyFieldLabel(partyKind, registerSide);

  const filteredCustomers = useMemo(() => {
    const branch = String(selectedBranch || '').trim();
    const list = Array.isArray(customers) ? customers : [];
    if (!branch) return list;
    return list.filter((c) => !c.branchId || String(c.branchId) === branch);
  }, [customers, selectedBranch]);

  const filteredStaff = useMemo(() => {
    const branch = String(selectedBranch || '').trim();
    const list = Array.isArray(staff) ? staff : [];
    const sorted = [...list].sort((a, b) =>
      String(a.displayName || a.username || '').localeCompare(
        String(b.displayName || b.username || ''),
        undefined,
        { sensitivity: 'base' }
      )
    );
    if (!branch) return sorted;
    return sorted.filter((s) => !s.branchId || String(s.branchId) === branch);
  }, [staff, selectedBranch]);

  const counterpartyBranches = useMemo(
    () => branches.filter((b) => branchOptionId(b) && branchOptionId(b) !== String(selectedBranch || '').trim()),
    [branches, selectedBranch]
  );

  const { busy, error, createLine, updateLine } = useAccountingRegisterMutations();

  const handleCategoryChange = (nextCategory) => {
    setCategory(nextCategory);
    const nextKind = registerPartyKindForCategory(nextCategory);
    if (nextKind !== partyKind) {
      setPartyRef('');
      if (nextKind) setPartyName('');
    }
  };

  const handleLinkedPartyChange = (nextRef) => {
    setPartyRef(nextRef);
    if (partyKind === 'staff') {
      const member = filteredStaff.find((s) => s.userId === nextRef);
      setPartyName(member?.displayName || member?.username || '');
      return;
    }
    if (partyKind === 'customer') {
      const cust = filteredCustomers.find((c) => c.customerID === nextRef);
      setPartyName(cust?.name || '');
      return;
    }
    if (partyKind === 'supplier') {
      const sup = suppliers.find((s) => s.supplierID === nextRef);
      setPartyName(sup?.name || '');
      return;
    }
    if (partyKind === 'branch') {
      const branch = branches.find((b) => branchOptionId(b) === nextRef);
      setPartyName(branchOptionLabel(branch));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (partyKind && !partyRef.trim()) return;

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
                  Category
                  <select className={INPUT} value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
                    {CATEGORIES[registerSide].map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                {partyKind === 'staff' ? (
                  <label className="sm:col-span-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {partyFieldLabel}
                    <select
                      className={INPUT}
                      value={partyRef}
                      onChange={(e) => handleLinkedPartyChange(e.target.value)}
                      required
                    >
                      <option value="">Select employee…</option>
                      {filteredStaff.map((s) => (
                        <option key={s.userId} value={s.userId}>
                          {s.displayName || s.username}
                          {s.employeeNo ? ` · ${s.employeeNo}` : ''}
                        </option>
                      ))}
                    </select>
                    {partyRef ? (
                      <span className="mt-1 block text-[9px] font-mono text-slate-500">{partyRef}</span>
                    ) : null}
                  </label>
                ) : null}

                {partyKind === 'customer' ? (
                  <label className="sm:col-span-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {partyFieldLabel}
                    <select
                      className={INPUT}
                      value={partyRef}
                      onChange={(e) => handleLinkedPartyChange(e.target.value)}
                      required
                    >
                      <option value="">Select customer…</option>
                      {filteredCustomers.map((c) => (
                        <option key={c.customerID} value={c.customerID}>
                          {c.name}
                          {c.phoneNumber ? ` · ${c.phoneNumber}` : ''}
                        </option>
                      ))}
                    </select>
                    {partyRef ? (
                      <span className="mt-1 block text-[9px] font-mono text-slate-500">{partyRef}</span>
                    ) : null}
                  </label>
                ) : null}

                {partyKind === 'supplier' ? (
                  <label className="sm:col-span-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {partyFieldLabel}
                    <select
                      className={INPUT}
                      value={partyRef}
                      onChange={(e) => handleLinkedPartyChange(e.target.value)}
                      required
                    >
                      <option value="">Select supplier…</option>
                      {suppliers.map((s) => (
                        <option key={s.supplierID} value={s.supplierID}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {partyRef ? (
                      <span className="mt-1 block text-[9px] font-mono text-slate-500">{partyRef}</span>
                    ) : null}
                  </label>
                ) : null}

                {partyKind === 'branch' ? (
                  <label className="sm:col-span-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {partyFieldLabel}
                    <select
                      className={INPUT}
                      value={partyRef}
                      onChange={(e) => handleLinkedPartyChange(e.target.value)}
                      required
                    >
                      <option value="">Select branch…</option>
                      {counterpartyBranches.map((b) => {
                        const id = branchOptionId(b);
                        return (
                          <option key={id} value={id}>
                            {branchOptionLabel(b)}
                          </option>
                        );
                      })}
                    </select>
                    {partyRef ? (
                      <span className="mt-1 block text-[9px] font-mono text-slate-500">{partyRef}</span>
                    ) : null}
                  </label>
                ) : null}

                {!partyKind ? (
                  <>
                    <label className="sm:col-span-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {partyFieldLabel}
                      <input
                        className={INPUT}
                        value={partyName}
                        onChange={(e) => setPartyName(e.target.value)}
                        required
                        placeholder="Customer / staff / supplier name"
                      />
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
                  </>
                ) : null}

                {branches.length ? (
                  <label className={`block text-[10px] font-bold uppercase tracking-wide text-slate-500 ${!partyKind ? '' : 'sm:col-span-2'}`}>
                    {partyKind === 'branch' ? 'This branch *' : 'Branch'}
                    <select
                      className={INPUT}
                      value={selectedBranch}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSelectedBranch(next);
                        if (partyKind === 'branch' && partyRef === next) {
                          setPartyRef('');
                          setPartyName('');
                        }
                      }}
                      required={partyKind === 'branch'}
                    >
                      {branches.map((b) => {
                        const id = branchOptionId(b);
                        return (
                          <option key={id} value={id}>
                            {branchOptionLabel(b)}
                          </option>
                        );
                      })}
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
                disabled={busy || (partyKind && !partyRef.trim())}
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
