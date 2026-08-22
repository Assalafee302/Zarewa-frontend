import React, { useEffect, useState } from 'react';
import { FormModal, FormModalFooter } from '../layout/FormModal';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CustomerFormFields } from '../customers/CustomerFormFields';
import { apiFetch } from '../../lib/apiBase';
import { branchScopedCreateBlockedMessage, isBranchScopedCreateBlocked } from '../../lib/workspaceBranchCreate';

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
  customerTitle: '',
  roleTagsStr: 'customer',
  bankAccountName: '',
  bankName: '',
  bankAccountNo: '',
};

/**
 * New-customer form in a modal (can stack above Quotation modal).
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

  useEffect(() => {
    if (isOpen) setForm(emptyForm);
  }, [isOpen]);

  const submitNew = async (e) => {
    e.preventDefault();
    if (isBranchScopedCreateBlocked(ws)) {
      showToast(branchScopedCreateBlockedMessage(ws), { variant: 'error' });
      return;
    }
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
        roleTags: String(rest.roleTagsStr || '')
          .split(/[,;]+/)
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
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
        /* refresh optional */
      }
    } catch (err) {
      showToast(err?.message || 'Could not save customer.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Sales · CRM"
      title="New customer"
      description="Register a buyer or project contact. Staff link is optional."
      size="md"
      formId="sales-new-customer-form"
      onSubmit={submitNew}
      trackId="modal-sales-customer-create"
      trackHydrateKey="new-customer"
      footer={
        <FormModalFooter
          onCancel={onClose}
          confirmType="submit"
          form="sales-new-customer-form"
          confirmLabel="Save customer"
          confirmLoading={saving}
          confirmLoadingLabel="Saving…"
          confirmDisabled={!ws?.canMutate}
        />
      }
    >
      {!ws?.canMutate ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900">
          System offline (read-only). Reconnect and refresh before registering customers.
        </div>
      ) : null}
      <fieldset disabled={!ws?.canMutate || saving} className="space-y-5 disabled:opacity-60">
        <CustomerFormFields
          form={form}
          setForm={setForm}
          tierOptions={['Regular', 'VIP', 'Wholesale', 'Staff']}
          paymentTermsOptions={['Due on receipt', 'Net 30']}
        />
      </fieldset>
    </FormModal>
  );
}
