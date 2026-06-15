import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { daysBetweenIso } from '../../lib/hrRequests';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual leave' },
  { value: 'casual', label: 'Casual leave' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'compassionate', label: 'Compassionate' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'other', label: 'Other' },
];

const STEPS = ['Type & dates', 'Details', 'Review'];

export default function MyLeave({ staffLinkBase = '/my-profile', embedded = false }) {
  const [modalOpen, setModalOpen] = useState(false);
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
  const [balancesError, setBalancesError] = useState('');
  const [probationEndIso, setProbationEndIso] = useState(null);

  const autoDays = useMemo(() => daysBetweenIso(startDateIso, endDateIso), [startDateIso, endDateIso]);

  useEffect(() => {
    if (autoDays != null) setDaysRequested(String(autoDays));
  }, [autoDays]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/leave/balances');
      if (!cancelled) {
        if (ok && data?.ok) {
          setBalances(data.balances || []);
          setBalancesError('');
        } else {
          setBalancesError(data?.error || 'Could not load leave balances.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { ok, data } = await apiFetch('/api/hr/me');
        if (!cancelled && ok && data?.ok) {
          setProbationEndIso(data.hr?.probationEndIso || null);
        }
      } catch {
        // ignore — probation check is informational
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const annualBalance = balances.find((b) => b.leaveType === 'annual');
  const typeBalance = balances.find((b) => b.leaveType === leaveType);
  const isOnProbation = probationEndIso ? new Date() < new Date(probationEndIso) : false;
  const casualBlockedByProbation = leaveType === 'casual' && isOnProbation;
  const daysNum = Number(daysRequested) || autoDays || 0;
  const exceedsBalance =
    ['annual', 'casual'].includes(leaveType) &&
    typeBalance &&
    daysNum > Number(typeBalance.closingDays ?? typeBalance.balance ?? 0);

  const resetWizard = () => {
    setStep(0);
    setLeaveType('annual');
    setStartDateIso('');
    setEndDateIso('');
    setDaysRequested('');
    setHandoverTo('');
    setContactDuringLeave('');
    setTitle('');
    setBody('');
    setError('');
  };

  const closeModal = () => {
    setModalOpen(false);
    resetWizard();
  };

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
    closeModal();
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
    closeModal();
  };

  const canNext =
    step === 0
      ? leaveType &&
        startDateIso &&
        endDateIso &&
        Number(daysRequested) > 0 &&
        !casualBlockedByProbation
      : step === 1
        ? handoverTo.trim().length >= 2
        : true;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {!embedded ? (
            <>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 sm:text-[11px]">Leave</h2>
              {annualBalance ? (
                <p className="mt-1 text-sm text-slate-600 sm:text-xs">
                  Annual balance (current period): <strong>{annualBalance.closingDays}</strong> days remaining
                </p>
              ) : balancesError ? (
                <p className="mt-1 text-sm text-amber-800">{balancesError}</p>
              ) : null}
            </>
          ) : annualBalance ? (
            <p className="text-sm text-slate-600">
              Annual balance: <strong>{annualBalance.closingDays}</strong> days remaining
            </p>
          ) : balancesError ? (
            <p className="text-sm text-amber-800">{balancesError}</p>
          ) : null}
        </div>
        <HrAddFormButton onClick={() => setModalOpen(true)}>Apply for leave</HrAddFormButton>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      <HrFormModal isOpen={modalOpen} onClose={closeModal} title="Apply for leave" size="lg">
        <div className="mb-4 flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-3 py-2 text-[10px] font-bold uppercase sm:text-[10px] ${
                i === step ? 'bg-[#134e4a] text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Leave type
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className={HR_FIELD_CLASS}>
                {LEAVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {casualBlockedByProbation ? (
              <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                ⚠️ Casual leave is not available during probation (ends {new Date(probationEndIso).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}).
              </div>
            ) : null}
            {exceedsBalance ? (
              <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                ⚠️ Requested days ({daysNum}) exceed your {leaveType} balance ({typeBalance?.closingDays ?? typeBalance?.balance ?? 0} days). HR may reject or adjust this request.
              </div>
            ) : null}
            {typeBalance && !exceedsBalance && daysNum > 0 ? (
              <div className="sm:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Balance after request (est.): <strong>{Math.max(0, Number(typeBalance.closingDays ?? typeBalance.balance ?? 0) - daysNum)}</strong> days remaining
              </div>
            ) : null}
            <label className="text-xs font-semibold text-slate-600">
              Start date
              <input type="date" value={startDateIso} onChange={(e) => setStartDateIso(e.target.value)} className={HR_FIELD_CLASS} />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              End date
              <input type="date" value={endDateIso} onChange={(e) => setEndDateIso(e.target.value)} className={HR_FIELD_CLASS} />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Days requested
              <input
                type="number"
                min={1}
                value={daysRequested}
                onChange={(e) => setDaysRequested(e.target.value)}
                className={HR_FIELD_CLASS}
              />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Handover to (name / role)
              <input value={handoverTo} onChange={(e) => setHandoverTo(e.target.value)} className={HR_FIELD_CLASS} placeholder="Colleague who will cover your duties" />
              <span className="mt-1 block text-[11px] font-normal normal-case text-slate-500">
                Name a colleague or acting supervisor — not yourself.
              </span>
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Contact during leave
              <input
                value={contactDuringLeave}
                onChange={(e) => setContactDuringLeave(e.target.value)}
                className={HR_FIELD_CLASS}
                placeholder="Phone or email"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Reason for leave
              <textarea
                className={`${HR_FIELD_CLASS} min-h-[72px]`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Brief reason — required for sick/compassionate leave"
                required={leaveType === 'sick' || leaveType === 'compassionate'}
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
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
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={HR_FIELD_CLASS} />
            </label>
          </dl>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className={HR_BTN_SECONDARY}>
              Back
            </button>
          ) : null}
          {step < 2 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className={HR_BTN_PRIMARY}>
              Next
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busy || casualBlockedByProbation}
                onClick={saveDraft}
                className={HR_BTN_SECONDARY}
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={busy || casualBlockedByProbation}
                onClick={saveAndSubmit}
                className={HR_BTN_PRIMARY}
              >
                Submit for approval
              </button>
            </>
          )}
        </div>
      </HrFormModal>

      <section>
        {!embedded ? (
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 sm:text-[11px]">My leave requests</h2>
        ) : null}
        <div className={embedded ? '' : 'mt-3'}>
          <HrRequestsPanel allowedScopes={['mine']} defaultScope="mine" kindFilter="leave" staffLinkBase={staffLinkBase} />
        </div>
      </section>
    </div>
  );
}
