import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { WorkPayFormModal } from '../profile/WorkPayFormModal';
import { WorkPayFormAlert, WorkPayHeroButton } from '../profile/workPayFormUi';
import { ProfileFormActions, ProfileFormField } from '../profile/profileFormUi';
import { HR_FIELD_CLASS } from './hrFormStyles';

const TYPES = [
  { value: 'absent', label: 'Absent — approved reason' },
  { value: 'late', label: 'Late — approved reason' },
];

export function MyAttendanceExceptionModal({ onSubmitted }) {
  const [open, setOpen] = useState(false);
  const [dayIso, setDayIso] = useState('');
  const [type, setType] = useState('absent');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setDayIso('');
    setType('absent');
    setReason('');
    setError('');
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!dayIso || reason.trim().length < 10) {
      setError('Pick a date and explain the reason (at least 10 characters).');
      return;
    }
    setBusy(true);
    setError('');
    const label = TYPES.find((t) => t.value === type)?.label || type;
    const created = await apiFetch('/api/hr/requests', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'attendance_exception',
        title: `Attendance exception — ${dayIso} (${label})`,
        body: reason.trim(),
        payload: { dayIso, type, reason: reason.trim() },
      }),
    });
    if (!created.ok || !created.data?.ok) {
      setBusy(false);
      setError(created.data?.error || 'Could not create request.');
      return;
    }
    const id = created.data.request?.id;
    const submitted = await apiFetch(`/api/hr/requests/${encodeURIComponent(id)}/submit`, { method: 'PATCH' });
    setBusy(false);
    if (!submitted.ok || !submitted.data?.ok) {
      setError(submitted.data?.error || 'Draft saved — submit from your requests list.');
      return;
    }
    close();
    onSubmitted?.();
  };

  return (
    <>
      <WorkPayHeroButton onClick={() => setOpen(true)}>Request exception</WorkPayHeroButton>
      <WorkPayFormModal
        isOpen={open}
        onClose={close}
        eyebrow="Work & pay"
        title="Attendance exception"
        description="Ask your branch manager to endorse an exception before payroll locks for that month."
        trackId="attendance-exception"
        footer={
          <ProfileFormActions className="!border-t-0 !pt-0">
            <HrButton type="button" variant="secondary" onClick={close}>
              Cancel
            </HrButton>
            <HrButton type="submit" form="attendance-exception-form" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit for endorsement'}
            </HrButton>
          </ProfileFormActions>
        }
      >
        <form id="attendance-exception-form" className="space-y-4" onSubmit={submit}>
          <WorkPayFormAlert variant="info">
            Use this when you were marked {type} for an approved reason (official duty, medical, etc.).
          </WorkPayFormAlert>
          {error ? <WorkPayFormAlert variant="error">{error}</WorkPayFormAlert> : null}
          <ProfileFormField label="Date" required>
            <input type="date" className={HR_FIELD_CLASS} value={dayIso} onChange={(e) => setDayIso(e.target.value)} required />
          </ProfileFormField>
          <ProfileFormField label="Exception type">
            <select className={HR_FIELD_CLASS} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </ProfileFormField>
          <ProfileFormField label="Reason" hint="At least 10 characters — include context for your manager." required>
            <textarea
              className={`${HR_FIELD_CLASS} min-h-[88px]`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this day should not count against payroll"
              required
              minLength={10}
            />
          </ProfileFormField>
        </form>
      </WorkPayFormModal>
    </>
  );
}
