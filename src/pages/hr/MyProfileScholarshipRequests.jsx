import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { FamilyBenefitsContextBar } from '../../components/hr/FamilyBenefitsContextBar';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { formatNgn } from '../../lib/hrFormat';
import { ProfileFormActions, ProfileFormField, ProfileFormSection } from '../../components/profile/profileFormUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';

const TABS = [
  { id: 'profile', label: 'Update school details' },
  { id: 'fee', label: 'Request school fees' },
  { id: 'history', label: 'My requests' },
];

async function createAndSubmitRequest(body) {
  const created = await apiFetch('/api/hr/requests', { method: 'POST', body: JSON.stringify(body) });
  if (!created.ok || !created.data?.ok || !created.data?.request?.id) {
    return { ok: false, error: created.data?.error || 'Could not create request.' };
  }
  const submitted = await apiFetch(`/api/hr/requests/${encodeURIComponent(created.data.request.id)}/submit`, {
    method: 'PATCH',
  });
  if (!submitted.ok || !submitted.data?.ok) {
    return { ok: false, error: submitted.data?.error || 'Request saved as draft but could not submit.' };
  }
  return { ok: true };
}

export default function MyProfileScholarshipRequests() {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [classLevel, setClassLevel] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [academicSession, setAcademicSession] = useState('');
  const [currentTerm, setCurrentTerm] = useState('');
  const [termStartIso, setTermStartIso] = useState('');
  const [termEndIso, setTermEndIso] = useState('');
  const [notes, setNotes] = useState('');

  const [feeTerm, setFeeTerm] = useState('');
  const [feeSession, setFeeSession] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeNotes, setFeeNotes] = useState('');

  const reload = async () => {
    const [summaryRes, reqRes] = await Promise.all([
      apiFetch('/api/hr/me/scholarship-summary'),
      apiFetch('/api/hr/requests?scope=mine&limit=20'),
    ]);
    if (summaryRes.ok && summaryRes.data?.ok) {
      const p = summaryRes.data.profile || {};
      setProfile(p);
      setClassLevel(p.classLevel || '');
      setSchoolName(p.schoolName || '');
      setAcademicSession(p.academicSession || '');
      setCurrentTerm(p.currentTerm || '');
      setTermStartIso(p.termStartIso || '');
      setTermEndIso(p.termEndIso || '');
      setRequests(summaryRes.data.pendingRequests || []);
    }
    if (reqRes.ok && reqRes.data?.ok) {
      const scholarshipReqs = (reqRes.data.requests || []).filter((r) =>
        ['scholarship_profile_update', 'scholarship_fee_request'].includes(r.kind)
      );
      setRequests((prev) => {
        const map = new Map();
        for (const r of [...prev, ...scholarshipReqs]) map.set(r.id, r);
        return [...map.values()].sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')));
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submitProfileUpdate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const r = await createAndSubmitRequest({
      kind: 'scholarship_profile_update',
      title: 'School profile update',
      body: notes || FAMILY_BENEFITS.requestsProfileBody,
      payload: {
        classLevel: classLevel || undefined,
        schoolName: schoolName || undefined,
        academicSession: academicSession || undefined,
        currentTerm: currentTerm || undefined,
        termStartIso: termStartIso || undefined,
        termEndIso: termEndIso || undefined,
        notes: notes || undefined,
      },
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setMessage(FAMILY_BENEFITS.requestsProfileSuccess);
    setTab('history');
    await reload();
  };

  const submitFeeRequest = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const amount = Math.round(Number(feeAmount) || 0);
    const r = await createAndSubmitRequest({
      kind: 'scholarship_fee_request',
      title: `School fees — ${feeTerm}`,
      body: feeNotes || `Fee request for ${feeTerm} (${feeSession}).`,
      payload: {
        term: feeTerm,
        academicSession: feeSession,
        amountRequestedNgn: amount > 0 ? amount : undefined,
        notes: feeNotes || undefined,
      },
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setMessage(FAMILY_BENEFITS.requestsFeeSuccess);
    setTab('history');
    await reload();
  };

  if (loading) {
    return (
      <ProfilePageBody>
        <ProfileMetricSkeleton count={1} />
      </ProfilePageBody>
    );
  }

  return (
    <ProfilePageBody>
      <ProfilePageIntro
        title={FAMILY_BENEFITS.requestsTitle}
        description={FAMILY_BENEFITS.requestsIntro}
        actions={
          <Link
            to={HR_SELF_SERVICE_PATH.school}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-700 no-underline hover:underline"
          >
            ← {FAMILY_BENEFITS.hubTitle}
          </Link>
        }
      />

      <FamilyBenefitsContextBar profile={profile} />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Request type">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              tab === t.id
                ? 'border-violet-300 bg-violet-100 text-violet-900'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}
      {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}

      {tab === 'profile' ? (
        <ProfileFormSection
          title="Update school details"
          subtitle="The office will review before changes appear on your profile."
        >
          <form onSubmit={submitProfileUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileFormField label="School name" htmlFor="req-school">
                <input id="req-school" className={HR_FIELD_CLASS} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
              </ProfileFormField>
              <ProfileFormField label="Class / level" htmlFor="req-class">
                <input id="req-class" className={HR_FIELD_CLASS} value={classLevel} onChange={(e) => setClassLevel(e.target.value)} />
              </ProfileFormField>
              <ProfileFormField label="Academic session" htmlFor="req-session">
                <input
                  id="req-session"
                  className={HR_FIELD_CLASS}
                  value={academicSession}
                  onChange={(e) => setAcademicSession(e.target.value)}
                  placeholder="2025/2026"
                />
              </ProfileFormField>
              <ProfileFormField label="Current term" htmlFor="req-term">
                <input id="req-term" className={HR_FIELD_CLASS} value={currentTerm} onChange={(e) => setCurrentTerm(e.target.value)} />
              </ProfileFormField>
              <ProfileFormField label="Term starts" htmlFor="req-term-start">
                <input
                  id="req-term-start"
                  type="date"
                  className={HR_FIELD_CLASS}
                  value={termStartIso}
                  onChange={(e) => setTermStartIso(e.target.value)}
                />
              </ProfileFormField>
              <ProfileFormField label="Term ends" htmlFor="req-term-end">
                <input
                  id="req-term-end"
                  type="date"
                  className={HR_FIELD_CLASS}
                  value={termEndIso}
                  onChange={(e) => setTermEndIso(e.target.value)}
                />
              </ProfileFormField>
            </div>
            <ProfileFormField label="Notes for the office" htmlFor="req-notes">
              <textarea id="req-notes" className={HR_FIELD_CLASS} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </ProfileFormField>
            <ProfileFormActions>
              <HrButton type="submit" disabled={busy} >
                {busy ? 'Submitting…' : FAMILY_BENEFITS.requestsSubmitOffice}
              </HrButton>
            </ProfileFormActions>
          </form>
        </ProfileFormSection>
      ) : null}

      {tab === 'fee' ? (
        <ProfileFormSection
          title="Request school fees"
          subtitle={
            profile?.schoolFeesNgn != null
              ? `Usual fee: ${formatNgn(profile.schoolFeesNgn)} — upload your invoice under Documents to speed processing.`
              : 'Upload your school fee invoice under Documents before or after submitting.'
          }
        >
          <form onSubmit={submitFeeRequest} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileFormField label="Term *" htmlFor="fee-term">
                <input id="fee-term" className={HR_FIELD_CLASS} value={feeTerm} onChange={(e) => setFeeTerm(e.target.value)} required />
              </ProfileFormField>
              <ProfileFormField label="Academic session *" htmlFor="fee-session">
                <input
                  id="fee-session"
                  className={HR_FIELD_CLASS}
                  value={feeSession}
                  onChange={(e) => setFeeSession(e.target.value)}
                  required
                  placeholder="2025/2026"
                />
              </ProfileFormField>
              <ProfileFormField
                label="Amount on invoice (₦)"
                htmlFor="fee-amount"
                hint="Optional — HR can confirm the amount"
                className="sm:col-span-2"
              >
                <input
                  id="fee-amount"
                  type="number"
                  min={0}
                  className={HR_FIELD_CLASS}
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                />
              </ProfileFormField>
            </div>
            <ProfileFormField label="Notes" htmlFor="fee-notes">
              <textarea id="fee-notes" className={HR_FIELD_CLASS} rows={3} value={feeNotes} onChange={(e) => setFeeNotes(e.target.value)} />
            </ProfileFormField>
            <p className="text-xs text-slate-500">
              Tip: upload your school fee invoice under{' '}
              <Link to={HR_SELF_SERVICE_PATH.documents} className="font-semibold text-violet-700">
                Documents
              </Link>{' '}
              before or after submitting.
            </p>
            <ProfileFormActions>
              <HrButton type="submit" disabled={busy} >
                {busy ? 'Submitting…' : 'Submit fee request'}
              </HrButton>
            </ProfileFormActions>
          </form>
        </ProfileFormSection>
      ) : null}

      {tab === 'history' ? (
        <ProfileOverviewSection title="My requests" subtitle="School profile updates and fee requests">
          {requests.length === 0 ? (
            <ProfileEmptyState
              title={FAMILY_BENEFITS.requestsEmpty}
              description="Submit a school details update or fee request using the tabs above."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{r.title || r.kind}</p>
                    <p className="text-xs text-slate-500">{r.createdAtIso?.slice(0, 10)}</p>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-amber-900">
                    {String(r.status || 'pending').replace(/_/g, ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ProfileOverviewSection>
      ) : null}
    </ProfilePageBody>
  );
}
