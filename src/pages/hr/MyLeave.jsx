import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { daysBetweenIso } from '../../lib/hrRequests';
import { HrAddFormButton } from '../../components/hr/HrFormModal';
import { WorkPayFormModal } from '../../components/profile/WorkPayFormModal';
import { WorkPayHero } from '../../components/profile/WorkPayHero';
import { WorkPayFormAlert, WorkPayHeroButton } from '../../components/profile/workPayFormUi';
import { ProfileFormActions, ProfileFormField } from '../../components/profile/profileFormUi';
import { leaveTypeLabel } from '../../lib/hrLeaveUi';
import { HR_LEAVE_TYPES } from '../../lib/hrPolicyConstants';
import { MyLeaveCalendarStrip } from '../../components/hr/MyLeaveCalendarStrip';
import { ProfilePageBody } from '../../components/profile/profilePageUi';
import { ProfileInlineAlert, ProfileOverviewSection } from '../../components/profile/profileOverviewUi';
import { ProfileKpiCard } from '../../components/profile/profileDesign';
import { ProfileProbationBanner } from '../../components/profile/ProfileProbationBanner';
import { useUserProfile } from '../../context/UserProfileContext';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

const LEAVE_TYPES = HR_LEAVE_TYPES;

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
  const { hr } = useUserProfile();
  const probationEndIso = hr?.probationEndIso || null;

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
    <ProfilePageBody className={embedded ? '!space-y-4' : ''}>
      {!embedded ? (
        <>
          <WorkPayHero
            eyebrow="Work & pay"
            title="Leave"
            description="Check balances, apply for leave, and track approvals. HR uses your handover details when endorsing requests."
            action={<WorkPayHeroButton onClick={() => setModalOpen(true)}>Apply for leave</WorkPayHeroButton>}
          />
          <ProfileProbationBanner />
        </>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {annualBalance ? (
            <p className="text-sm text-slate-600">
              Annual balance: <strong>{annualBalance.closingDays}</strong> days remaining
            </p>
          ) : balancesError ? (
            <p className="text-sm text-amber-800">{balancesError}</p>
          ) : null}
          <HrAddFormButton onClick={() => setModalOpen(true)}>Apply for leave</HrAddFormButton>
        </div>
      )}

      {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}

      {!embedded && balances.length > 0 ? (
        <ProfileOverviewSection title="Your balances" subtitle="Days remaining in the current leave period">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {balances.map((b) => (
              <ProfileKpiCard key={b.leaveType} label={leaveTypeLabel(b.leaveType)} className="transition hover:shadow-md">
                <p className="text-2xl font-black tabular-nums tracking-tight text-[#134e4a]">
                  {b.closingDays ?? b.balance ?? 0}
                  <span className="ml-1 text-xs font-bold text-slate-500">days</span>
                </p>
              </ProfileKpiCard>
            ))}
          </div>
        </ProfileOverviewSection>
      ) : null}

      {!embedded && balancesError && balances.length === 0 ? (
        <ProfileInlineAlert variant="warning">{balancesError}</ProfileInlineAlert>
      ) : null}

      {!embedded ? (
        <ProfileOverviewSection title="Approved leave ahead" subtitle="Your approved leave in the next six months">
          <MyLeaveCalendarStrip />
        </ProfileOverviewSection>
      ) : null}

      <WorkPayFormModal
        isOpen={modalOpen}
        onClose={closeModal}
        eyebrow="Work & pay"
        title="Apply for leave"
        description="Choose dates, name your handover contact, then submit for HR review."
        steps={STEPS}
        currentStep={step}
        trackId="leave-application"
        footer={
          <ProfileFormActions className="!border-t-0 !pt-0">
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
          </ProfileFormActions>
        }
      >
        <div className="space-y-4">
          {error ? <WorkPayFormAlert variant="error">{error}</WorkPayFormAlert> : null}

          {step === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileFormField label="Leave type" className="sm:col-span-2">
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className={HR_FIELD_CLASS}>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </ProfileFormField>
              {casualBlockedByProbation ? (
                <WorkPayFormAlert variant="warning" className="sm:col-span-2">
                  Casual leave is not available during probation (ends{' '}
                  {new Date(probationEndIso).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}).
                </WorkPayFormAlert>
              ) : null}
              {exceedsBalance ? (
                <WorkPayFormAlert variant="warning" className="sm:col-span-2">
                  Requested days ({daysNum}) exceed your {leaveTypeLabel(leaveType)} balance (
                  {typeBalance?.closingDays ?? typeBalance?.balance ?? 0} days). HR may reject or adjust this request.
                </WorkPayFormAlert>
              ) : null}
              {typeBalance && !exceedsBalance && daysNum > 0 ? (
                <WorkPayFormAlert variant="success" className="sm:col-span-2">
                  Balance after request (est.):{' '}
                  <strong>{Math.max(0, Number(typeBalance.closingDays ?? typeBalance.balance ?? 0) - daysNum)}</strong> days
                  remaining
                </WorkPayFormAlert>
              ) : null}
              <ProfileFormField label="Start date">
                <input type="date" value={startDateIso} onChange={(e) => setStartDateIso(e.target.value)} className={HR_FIELD_CLASS} />
              </ProfileFormField>
              <ProfileFormField label="End date">
                <input type="date" value={endDateIso} onChange={(e) => setEndDateIso(e.target.value)} className={HR_FIELD_CLASS} />
              </ProfileFormField>
              <ProfileFormField label="Days requested">
                <input
                  type="number"
                  min={1}
                  value={daysRequested}
                  onChange={(e) => setDaysRequested(e.target.value)}
                  className={HR_FIELD_CLASS}
                />
              </ProfileFormField>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileFormField
                label="Handover to (name / role)"
                hint="Name a colleague or acting supervisor — not yourself."
                className="sm:col-span-2"
                required
              >
                <input value={handoverTo} onChange={(e) => setHandoverTo(e.target.value)} className={HR_FIELD_CLASS} placeholder="Colleague who will cover your duties" />
              </ProfileFormField>
              <ProfileFormField label="Contact during leave" className="sm:col-span-2">
                <input
                  value={contactDuringLeave}
                  onChange={(e) => setContactDuringLeave(e.target.value)}
                  className={HR_FIELD_CLASS}
                  placeholder="Phone or email"
                />
              </ProfileFormField>
              <ProfileFormField
                label="Reason for leave"
                hint="Required for sick or compassionate leave."
                className="sm:col-span-2"
                required={leaveType === 'sick' || leaveType === 'compassionate'}
              >
                <textarea
                  className={`${HR_FIELD_CLASS} min-h-[72px]`}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Brief reason"
                  required={leaveType === 'sick' || leaveType === 'compassionate'}
                />
              </ProfileFormField>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <dl className="grid gap-3 rounded-xl border border-slate-100 bg-white p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-black uppercase text-slate-400">Type</dt>
                  <dd className="font-semibold">{leaveTypeLabel(leaveType)}</dd>
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
              </dl>
              <ProfileFormField label="Additional notes" className="sm:col-span-2">
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={HR_FIELD_CLASS} />
              </ProfileFormField>
            </div>
          ) : null}
        </div>
      </WorkPayFormModal>

      <ProfileOverviewSection
        title="My leave requests"
        subtitle="Drafts waiting to submit and requests under HR review"
      >
        <HrRequestsPanel allowedScopes={['mine']} defaultScope="mine" kindFilter="leave" staffLinkBase={staffLinkBase} showStageBar />
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
