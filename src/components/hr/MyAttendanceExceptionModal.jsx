import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

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
      <HrAddFormButton onClick={() => setOpen(true)}>Request exception</HrAddFormButton>
      <HrFormModal isOpen={open} onClose={close} title="Attendance exception" size="lg">
        <p className="mb-4 text-sm text-slate-600">
          Ask your branch manager to endorse an exception before payroll is locked for that month. Use this when you were
          marked {type} for an approved reason (official duty, medical, etc.).
        </p>
        <form className="space-y-4" onSubmit={submit}>
          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : null}
          <label className="block text-xs font-semibold text-slate-600">
            Date
            <input type="date" className={`mt-1 ${HR_FIELD_CLASS}`} value={dayIso} onChange={(e) => setDayIso(e.target.value)} required />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Exception type
            <select className={`mt-1 ${HR_FIELD_CLASS}`} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Reason
            <textarea
              className={`mt-1 ${HR_FIELD_CLASS} min-h-[88px]`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this day should not count against payroll"
              required
              minLength={10}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={close} className={HR_BTN_SECONDARY}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
              {busy ? 'Submitting…' : 'Submit for endorsement'}
            </button>
          </div>
        </form>
      </HrFormModal>
    </>
  );
}
