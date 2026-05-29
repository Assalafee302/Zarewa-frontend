import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { daysBetweenIso } from '../../lib/hrRequests';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual leave' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'compassionate', label: 'Compassionate' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'other', label: 'Other' },
];

const STEPS = ['Type & dates', 'Details', 'Review'];

export default function MyLeave() {
  const [step, setStep] = useState(0);
  const [leaveType, setLeaveType] = useState('annual');
  const [startDateIso, setStartDateIso] = useState('');
  const [endDateIso, setEndDateIso] = useState('');
  const [daysRequested, setDaysRequested] = useState('');
  const [handoverTo, setHandoverTo] = useState('');
  const [contactDuringLeave, setContactDuringLeave] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [balances, setBalances] = useState([]);

  const autoDays = useMemo(() => daysBetweenIso(startDateIso, endDateIso), [startDateIso, endDateIso]);

  useEffect(() => {
    if (autoDays != null) setDaysRequested(String(autoDays));
  }, [autoDays]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/leave/balances');
      if (!cancelled && ok && data?.ok) setBalances(data.balances || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const annualBalance = balances.find((b) => b.leaveType === 'annual');

  const buildPayload = () => ({
    kind: 'leave',
    title: title.trim() || `${LEAVE_TYPES.find((t) => t.value === leaveType)?.label || 'Leave'} request`,
    body: body.trim() || null,
    payload: {
      leaveType,
      startDateIso,
      endDateIso,
      daysRequested: Number(daysRequested) || autoDays || 0,
      handoverTo: handoverTo.trim() || null,
      contactDuringLeave: contactDuringLeave.trim() || null,
    },
  });

  const saveDraft = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const { ok, data } = await apiFetch('/api/hr/requests', {
      method: 'POST',
      body: JSON.stringify(buildPayload()),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not create leave request.');
      return;
    }
    setMessage('Draft saved. Submit it from My requests below.');
    setStep(0);
  };

  const saveAndSubmit = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const created = await apiFetch('/api/hr/requests', {
      method: 'POST',
      body: JSON.stringify(buildPayload()),
    });
    if (!created.ok || !created.data?.ok) {
      setBusy(false);
      setError(created.data?.error || 'Could not create leave request.');
      return;
    }
    const id = created.data.request?.id;
    const submitted = await apiFetch(`/api/hr/requests/${encodeURIComponent(id)}/submit`, { method: 'PATCH' });
    setBusy(false);
    if (!submitted.ok || !submitted.data?.ok) {
      setError(submitted.data?.error || 'Draft created but submit failed.');
      return;
    }
    setMessage('Leave request submitted for HR review.');
    setStep(0);
  };

  const canNext =
    step === 0
      ? leaveType && startDateIso && endDateIso && Number(daysRequested) > 0
      : step === 1
        ? handoverTo.trim().length >= 2
        : true;

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Apply for leave</h2>
        {annualBalance ? (
          <p className="mt-2 text-xs text-slate-600">
            Annual balance (current period): <strong>{annualBalance.closingDays}</strong> days remaining
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                i === step ? 'bg-[#134e4a] text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}
        {message ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {message}
          </div>
        ) : null}

        {step === 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Leave type
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Start date
              <input
                type="date"
                value={startDateIso}
                onChange={(e) => setStartDateIso(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              End date
              <input
                type="date"
                value={endDateIso}
                onChange={(e) => setEndDateIso(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Days requested
              <input
                type="number"
                min={1}
                value={daysRequested}
                onChange={(e) => setDaysRequested(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Handover to (name / role)
              <input
                value={handoverTo}
                onChange={(e) => setHandoverTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Contact during leave
              <input
                value={contactDuringLeave}
                onChange={(e) => setContactDuringLeave(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Phone or email"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Short title (optional)
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-black uppercase text-slate-400">Type</dt>
              <dd className="font-semibold">{leaveType}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase text-slate-400">Dates</dt>
              <dd className="font-semibold">
                {startDateIso} → {endDateIso} ({daysRequested} days)
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-black uppercase text-slate-400">Handover</dt>
              <dd className="font-semibold">{handoverTo}</dd>
            </div>
            <label className="sm:col-span-2 text-xs font-semibold text-slate-600">
              Additional notes
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </dl>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-bold uppercase text-slate-700"
            >
              Back
            </button>
          ) : null}
          {step < 2 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-xl bg-[#134e4a] px-4 py-2 text-[11px] font-bold uppercase text-white disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={saveDraft}
                className="rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-bold uppercase text-slate-700"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={saveAndSubmit}
                className="rounded-xl bg-[#134e4a] px-4 py-2 text-[11px] font-bold uppercase text-white"
              >
                Submit for approval
              </button>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">My leave requests</h2>
        <div className="mt-3">
          <HrRequestsPanel allowedScopes={['mine']} defaultScope="mine" kindFilter="leave" staffLinkBase="/my-profile" />
        </div>
      </section>
    </div>
  );
}
