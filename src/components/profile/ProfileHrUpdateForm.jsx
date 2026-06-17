import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../hr/hrFormStyles';

const FIELDS = [
  { id: 'ninNumber', label: 'NIN number', type: 'text' },
  { id: 'bvnNumber', label: 'BVN number', type: 'text' },
  { id: 'nextOfKin', label: 'Next of kin', type: 'nok' },
  { id: 'bankDetails', label: 'Bank details', type: 'bank' },
];

export function ProfileHrUpdateForm() {
  const { show: showToast } = useToast();
  const { reload } = useUserProfile();
  const [field, setField] = useState('ninNumber');
  const [ninNumber, setNinNumber] = useState('');
  const [bvnNumber, setBvnNumber] = useState('');
  const [nokName, setNokName] = useState('');
  const [nokPhone, setNokPhone] = useState('');
  const [nokRelationship, setNokRelationship] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const buildPayload = () => {
    if (field === 'ninNumber') {
      return { field: 'ninNumber', requestedValue: ninNumber.trim(), currentValue: null };
    }
    if (field === 'bvnNumber') {
      return { field: 'bvnNumber', requestedValue: bvnNumber.trim(), currentValue: null };
    }
    if (field === 'nextOfKin') {
      return {
        field: 'nextOfKin',
        requestedValue: {
          name: nokName.trim(),
          phone: nokPhone.trim(),
          relationship: nokRelationship.trim(),
        },
      };
    }
    return {
      field: 'bankDetails',
      requestedValue: {
        bankName: bankName.trim(),
        bankAccountName: bankAccountName.trim(),
        bankAccountNo: bankAccountNo.trim(),
      },
    };
  };

  const buildTitle = () => {
    if (field === 'ninNumber') return `Update NIN to ${ninNumber.trim()}`;
    if (field === 'bvnNumber') return `Update BVN to ${bvnNumber.trim()}`;
    if (field === 'nextOfKin') return `Update next of kin: ${nokName.trim()}`;
    return `Update bank details: ${bankName.trim()}`;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      showToast('Explain why this change is needed (at least 10 characters).', { variant: 'error' });
      return;
    }
    setBusy(true);
    const payload = buildPayload();
    const { ok, data } = await apiFetch('/api/hr/requests', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'profile_change',
        title: buildTitle(),
        body: reason.trim(),
        payload,
      }),
    });
    if (!ok || !data?.ok) {
      setBusy(false);
      showToast(data?.error || 'Could not submit request.', { variant: 'error' });
      return;
    }
    const id = data.request?.id;
    const submitted = await apiFetch(`/api/hr/requests/${encodeURIComponent(id)}/submit`, { method: 'PATCH' });
    setBusy(false);
    if (!submitted.ok || !submitted.data?.ok) {
      showToast(submitted.data?.error || 'Request saved but submit failed.', { variant: 'error' });
      return;
    }
    showToast('Update request submitted for HR approval.');
    setReason('');
    await reload?.();
  };

  return (
    <section className="rounded-2xl border border-teal-100 bg-teal-50/30 p-5">
      <h3 className="text-sm font-black text-slate-900">Request HR record update</h3>
      <p className="mt-1 text-xs text-slate-600">
        Official employment fields are updated by HR after review. Submit a change request below.
      </p>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <label className="block text-xs font-semibold text-slate-600">
          What to update
          <select className={`${HR_FIELD_CLASS} mt-1`} value={field} onChange={(e) => setField(e.target.value)}>
            {FIELDS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        {field === 'ninNumber' ? (
          <label className="block text-xs font-semibold text-slate-600">
            New NIN
            <input className={`${HR_FIELD_CLASS} mt-1 font-mono`} value={ninNumber} onChange={(e) => setNinNumber(e.target.value)} minLength={11} maxLength={11} required />
          </label>
        ) : null}

        {field === 'bvnNumber' ? (
          <label className="block text-xs font-semibold text-slate-600">
            New BVN
            <input className={`${HR_FIELD_CLASS} mt-1 font-mono`} value={bvnNumber} onChange={(e) => setBvnNumber(e.target.value)} minLength={11} maxLength={11} required />
          </label>
        ) : null}

        {field === 'nextOfKin' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Name
              <input className={`${HR_FIELD_CLASS} mt-1`} value={nokName} onChange={(e) => setNokName(e.target.value)} required />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Phone
              <input className={`${HR_FIELD_CLASS} mt-1`} value={nokPhone} onChange={(e) => setNokPhone(e.target.value)} required />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Relationship
              <input className={`${HR_FIELD_CLASS} mt-1`} value={nokRelationship} onChange={(e) => setNokRelationship(e.target.value)} required />
            </label>
          </div>
        ) : null}

        {field === 'bankDetails' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Bank name
              <input className={`${HR_FIELD_CLASS} mt-1`} value={bankName} onChange={(e) => setBankName(e.target.value)} required />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Account name
              <input className={`${HR_FIELD_CLASS} mt-1`} value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} required />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Account number
              <input className={`${HR_FIELD_CLASS} mt-1 font-mono`} value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} required />
            </label>
          </div>
        ) : null}

        <label className="block text-xs font-semibold text-slate-600">
          Reason for change
          <textarea className={`${HR_FIELD_CLASS} mt-1 min-h-[72px]`} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={10} placeholder="Why is this update needed?" />
        </label>

        <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
          {busy ? 'Submitting…' : 'Submit to HR for approval'}
        </button>
      </form>
    </section>
  );
}
