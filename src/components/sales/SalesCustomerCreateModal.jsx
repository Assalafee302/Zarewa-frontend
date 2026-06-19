import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ModalFrame, ModalScrollShell, ModalScrollHeader, ModalScrollBody } from '../layout';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTrackedUnsavedForm } from '../../hooks/useTrackedUnsavedForm';
import { CustomerStaffLinkField } from './CustomerStaffLinkField';
import { apiFetch } from '../../lib/apiBase';

const emptyForm = {
  name: '',
  phoneNumber: '',
  email: '',
  addressShipping: '',
  addressBilling: '',
  status: 'Active',
  tier: 'Regular',
  paymentTerms: 'Net 30',
  linkedStaffUserId: '',
};

/**
 * New-customer form in a modal (can stack above Quotation modal).
 * @param {{ isOpen: boolean; onClose: () => void; createdByLabel?: string; onCreated?: (p: { customerID: string; name: string; phoneNumber: string }) => void }} props
 */
export default function SalesCustomerCreateModal({
  isOpen,
  onClose,
  createdByLabel = 'Sales',
  onCreated,
}) {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const [form, setForm] = useState(emptyForm);
  const { captureEdited, wrapClose } = useTrackedUnsavedForm('modal-sales-customer-create', {
    isOpen,
    hydrateKey: 'new-customer',
  });
  const handleClose = wrapClose(onClose);

  useEffect(() => {
    if (isOpen) setForm(emptyForm);
  }, [isOpen]);

  const submitNew = async (e) => {
    e.preventDefault();
    const staffLinked = Boolean(String(form.linkedStaffUserId || '').trim());
    if (!form.name.trim()) {
      showToast('Name is required.', { variant: 'error' });
      return;
    }
    if (!staffLinked && !form.phoneNumber.trim()) {
      showToast('Phone is required unless this is a staff purchase credit account.', { variant: 'error' });
      return;
    }
    const iso = new Date().toISOString().slice(0, 10);
    try {
      const { linkedStaffUserId, ...rest } = form;
      const payload = {
        ...rest,
        name: rest.name.trim(),
        tier: staffLinked ? 'Staff' : rest.tier,
        paymentTerms: staffLinked ? 'Staff credit' : rest.paymentTerms,
        phoneNumber: rest.phoneNumber.trim() || (staffLinked ? 'STAFF' : ''),
        createdAtISO: iso,
        lastActivityISO: iso,
        createdBy: createdByLabel,
        ...(staffLinked ? { linkedStaffUserId: linkedStaffUserId.trim() } : {}),
      };

      const { ok, data } = await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!ok || !data?.ok) throw new Error(data?.error || 'Create customer API failed');

      await ws?.refresh?.();
      const customerID = String(data.customerID || '').trim();
      const displayName = data.staffLink?.customerName || form.name.trim();
      onCreated?.({
        customerID,
        name: displayName,
        phoneNumber: form.phoneNumber.trim() || 'STAFF',
      });
      setForm(emptyForm);
      onClose();
      showToast(
        customerID
          ? staffLinked
            ? `Staff customer ${customerID} linked for purchase credit.`
            : `Customer ${customerID} saved.`
          : 'Customer saved.'
      );
    } catch (err) {
      showToast(err?.message || 'Could not save customer.', { variant: 'error' });
    }
  };

  return (
    <ModalFrame isOpen={isOpen} onClose={handleClose}>
      <ModalScrollShell size="md">
        <ModalScrollHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-[#134e4a]">New Customer</h3>
            <button type="button" onClick={handleClose} className="p-2 min-h-11 min-w-11 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50">
              <X size={22} />
            </button>
          </div>
        </ModalScrollHeader>
        <ModalScrollBody>
          {!ws?.canMutate ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
              System offline (read-only). Reconnect and refresh before registering customers.
            </div>
          ) : null}
          <form id="sales-new-customer-form" onSubmit={submitNew} className="space-y-4" onInput={captureEdited} onChange={captureEdited}>
            <fieldset disabled={!ws?.canMutate} className="space-y-4 disabled:opacity-60">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="z-finance-field rounded-xl font-bold text-[#134e4a]"
                />
              </div>
              <CustomerStaffLinkField
                value={form.linkedStaffUserId}
                onChange={(staffUserId) =>
                  setForm((f) => ({
                    ...f,
                    linkedStaffUserId: staffUserId,
                    tier: staffUserId ? 'Staff' : f.tier === 'Staff' ? 'Regular' : f.tier,
                    paymentTerms: staffUserId ? 'Staff credit' : f.paymentTerms,
                  }))
                }
                onStaffPick={(staff) => {
                  if (!staff) return;
                  setForm((f) => ({
                    ...f,
                    name: f.name.trim() ? f.name : staff.label || staff.displayName || f.name,
                  }));
                }}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Phone {form.linkedStaffUserId ? '' : '*'}
                  </label>
                  <input
                    required={!form.linkedStaffUserId}
                    value={form.phoneNumber}
                    onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    className="z-finance-field rounded-xl font-bold text-[#134e4a]"
                    placeholder={form.linkedStaffUserId ? 'Optional for staff accounts' : ''}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="z-finance-field rounded-xl font-bold text-[#134e4a]"
                  />
                </div>
              </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shipping Address</label>
              <textarea
                rows={2}
                value={form.addressShipping}
                onChange={(e) => setForm((f) => ({ ...f, addressShipping: e.target.value }))}
                className="z-finance-field rounded-xl font-medium text-[#134e4a] resize-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tier</label>
                <select
                  value={form.tier}
                  onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
                  className="z-finance-select rounded-xl font-bold text-[#134e4a]"
                >
                  <option value="Regular">Regular</option>
                  <option value="VIP">VIP</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Staff">Staff (purchase credit)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terms</label>
                <select
                  value={form.paymentTerms}
                  onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                  className="z-finance-select rounded-xl font-bold text-[#134e4a]"
                >
                  <option value="Due on receipt">Due on receipt</option>
                  <option value="Net 30">Net 30</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="z-finance-select rounded-xl font-bold text-[#134e4a]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full min-h-11 bg-[#134e4a] text-white rounded-xl py-4 text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-900/20 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Save Customer
            </button>
          </fieldset>
        </form>
        </ModalScrollBody>
      </ModalScrollShell>
    </ModalFrame>
  );
}
