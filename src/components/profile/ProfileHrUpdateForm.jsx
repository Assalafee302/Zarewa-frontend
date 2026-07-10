import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { HR_BTN_PRIMARY } from '../hr/hrFormStyles';
import { ProfileFormField, PROFILE_INPUT_CLASS, PROFILE_TEXTAREA_CLASS } from './profileFormUi';

const FIELDS = [
  { id: 'ninNumber', label: 'NIN number' },
  { id: 'bvnNumber', label: 'BVN number' },
  { id: 'nextOfKin', label: 'Next of kin' },
  { id: 'bankDetails', label: 'Bank details' },
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
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-semibold text-slate-900">Request HR record update</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Your profile is locked. Submit a change request and HR will review before updating your official record.
      </p>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <ProfileFormField label="What to update">
          <select className={PROFILE_INPUT_CLASS} value={field} onChange={(e) => setField(e.target.value)}>
            {FIELDS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </ProfileFormField>

        {field === 'ninNumber' ? (
          <ProfileFormField label="New NIN" hint="11 digits">
            <input
              className={`${PROFILE_INPUT_CLASS} font-mono`}
              value={ninNumber}
              onChange={(e) => setNinNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
              inputMode="numeric"
              maxLength={11}
              required
            />
          </ProfileFormField>
        ) : null}

        {field === 'bvnNumber' ? (
          <ProfileFormField label="New BVN" hint="11 digits">
            <input
              className={`${PROFILE_INPUT_CLASS} font-mono`}
              value={bvnNumber}
              onChange={(e) => setBvnNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
              inputMode="numeric"
              maxLength={11}
              required
            />
          </ProfileFormField>
        ) : null}

        {field === 'nextOfKin' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFormField label="Name">
              <input className={PROFILE_INPUT_CLASS} value={nokName} onChange={(e) => setNokName(e.target.value)} required />
            </ProfileFormField>
            <ProfileFormField label="Phone">
              <input className={PROFILE_INPUT_CLASS} value={nokPhone} onChange={(e) => setNokPhone(e.target.value)} inputMode="tel" required />
            </ProfileFormField>
            <ProfileFormField label="Relationship" className="sm:col-span-2">
              <input className={PROFILE_INPUT_CLASS} value={nokRelationship} onChange={(e) => setNokRelationship(e.target.value)} required />
            </ProfileFormField>
          </div>
        ) : null}

        {field === 'bankDetails' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFormField label="Bank name">
              <input className={PROFILE_INPUT_CLASS} value={bankName} onChange={(e) => setBankName(e.target.value)} required />
            </ProfileFormField>
            <ProfileFormField label="Account name">
              <input className={PROFILE_INPUT_CLASS} value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} required />
            </ProfileFormField>
            <ProfileFormField label="Account number" className="sm:col-span-2">
              <input
                className={`${PROFILE_INPUT_CLASS} font-mono`}
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric"
                required
              />
            </ProfileFormField>
          </div>
        ) : null}

        <ProfileFormField label="Reason for change" hint="At least 10 characters">
          <textarea
            className={PROFILE_TEXTAREA_CLASS}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={10}
            placeholder="Why is this update needed?"
          />
        </ProfileFormField>

        <button type="submit" disabled={busy} className={`${HR_BTN_PRIMARY} w-full sm:w-auto`}>
          {busy ? 'Submitting…' : 'Submit to HR for approval'}
        </button>
      </form>
    </section>
  );
}
