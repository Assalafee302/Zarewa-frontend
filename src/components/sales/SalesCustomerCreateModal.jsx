import React, { useEffect, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { ModalFrame, ModalScrollShell, ModalScrollHeader, ModalScrollBody } from '../layout';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTrackedUnsavedForm } from '../../hooks/useTrackedUnsavedForm';
import { CustomerFormFields } from '../customers/CustomerFormFields';
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
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
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
      try {
        await ws?.refresh?.();
      } catch {
        /* Customer was saved; refresh can retry on next navigation. */
      }
    } catch (err) {
      showToast(err?.message || 'Could not save customer.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalFrame isOpen={isOpen} onClose={handleClose}>
      <ModalScrollShell size="md">
        <ModalScrollHeader>
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-1">Sales · CRM</p>
              <h3 className="text-xl font-black text-[#134e4a] flex items-center gap-2">
                <UserPlus size={22} className="text-teal-600 shrink-0" />
                New customer
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Register a buyer or project contact. Staff link is optional.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 min-h-11 min-w-11 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 shrink-0"
            >
              <X size={22} />
            </button>
          </div>
        </ModalScrollHeader>
        <ModalScrollBody>
          {!ws?.canMutate ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] font-semibold text-amber-900">
              System offline (read-only). Reconnect and refresh before registering customers.
            </div>
          ) : null}
          <form
            id="sales-new-customer-form"
            onSubmit={submitNew}
            className="space-y-5"
            onInput={captureEdited}
            onChange={captureEdited}
          >
            <fieldset disabled={!ws?.canMutate || saving} className="space-y-5 disabled:opacity-60">
              <CustomerFormFields
                form={form}
                setForm={setForm}
                tierOptions={['Regular', 'VIP', 'Wholesale', 'Staff']}
                paymentTermsOptions={['Due on receipt', 'Net 30']}
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full min-h-12 rounded-xl bg-[#134e4a] text-white py-3.5 text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-900/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save customer'}
              </button>
            </fieldset>
          </form>
        </ModalScrollBody>
      </ModalScrollShell>
    </ModalFrame>
  );
}
