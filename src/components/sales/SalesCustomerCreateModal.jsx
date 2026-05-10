import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { useCustomers } from '../../context/CustomersContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';

const emptyForm = {
  name: '',
  phoneNumber: '',
  email: '',
  addressShipping: '',
  addressBilling: '',
  status: 'Active',
  tier: 'Regular',
  paymentTerms: 'Net 30',
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
  const { addCustomer } = useCustomers();
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isOpen) setForm(emptyForm);
  }, [isOpen]);

  const submitNew = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phoneNumber.trim()) {
      showToast('Name and phone required.', { variant: 'error' });
      return;
    }
    const iso = new Date().toISOString().slice(0, 10);
    try {
      const newId = await addCustomer({
        ...form,
        createdAtISO: iso,
        lastActivityISO: iso,
        createdBy: createdByLabel,
      });
      const customerID = String(newId || '').trim();
      onCreated?.({
        customerID,
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
      });
      setForm(emptyForm);
      onClose();
      showToast(customerID ? `Customer ${customerID} saved.` : 'Customer saved.');
    } catch (err) {
      showToast(err?.message || 'Could not save customer.', { variant: 'error' });
    }
  };

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose}>
      <div className="z-modal-panel max-w-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-[#134e4a]">New Customer</h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50">
            <X size={22} />
          </button>
        </div>
        {!ws?.canMutate ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
            System offline (read-only). Reconnect and refresh before registering customers.
          </div>
        ) : null}
        <form onSubmit={submitNew} className="space-y-4">
          <fieldset disabled={!ws?.canMutate} className="space-y-4 disabled:opacity-60">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-[#134e4a] outline-none focus:ring-2 focus:ring-teal-500/10"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone *</label>
                <input
                  required
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-[#134e4a] outline-none focus:ring-2 focus:ring-teal-500/10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-[#134e4a] outline-none focus:ring-2 focus:ring-teal-500/10"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shipping Address</label>
              <textarea
                rows={2}
                value={form.addressShipping}
                onChange={(e) => setForm((f) => ({ ...f, addressShipping: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-medium text-[#134e4a] outline-none focus:ring-2 focus:ring-teal-500/10 resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tier</label>
                <select
                  value={form.tier}
                  onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold text-[#134e4a] outline-none"
                >
                  <option value="Regular">Regular</option>
                  <option value="VIP">VIP</option>
                  <option value="Wholesale">Wholesale</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terms</label>
                <select
                  value={form.paymentTerms}
                  onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold text-[#134e4a] outline-none"
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
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold text-[#134e4a] outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-[#134e4a] text-white rounded-xl py-4 text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-900/20 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Save Customer
            </button>
          </fieldset>
        </form>
      </div>
    </ModalFrame>
  );
}
