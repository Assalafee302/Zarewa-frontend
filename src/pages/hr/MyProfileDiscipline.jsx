import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from '../../components/hr/hrFormStyles';
import { HrConfidentialBanner } from '../../components/hr/HrSensitiveField';
import { ProfileFormField } from '../../components/profile/profileFormUi';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ProfileListRow, ProfileStatusChip } from '../../components/profile/profileDesign';

const STATUS_VARIANT = {
  open: 'info',
  awaiting_employee_response: 'pending',
  appealed: 'info',
  closed: 'neutral',
};

function fetchMyDisciplineCases() {
  return apiFetch('/api/hr/my/discipline-cases');
}

export default function MyProfileDiscipline() {
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [response, setResponse] = useState('');
  const [appealGrounds, setAppealGrounds] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { loading, error: loadError, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchMyDisciplineCases();
    if (!ok || !data?.ok) {
      setCases([]);
      return { error: data?.error || 'Could not load your cases.', hasData: false };
    }
    setCases(data.cases || []);
    return { hasData: true };
  }, []);

  const selectCase = useCallback((caseId) => {
    setSelected((prev) => {
      const next = prev === caseId ? null : caseId;
      if (next !== prev) {
        setResponse('');
        setAppealGrounds('');
        setError('');
      }
      return next;
    });
  }, []);

  const submitResponse = async (caseId) => {
    if (!response.trim()) return;
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch(`/api/hr/my/discipline-cases/${encodeURIComponent(caseId)}/response`, {
      method: 'PATCH',
      body: JSON.stringify({ response: response.trim() }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not submit response.');
      return;
    }
    setMessage('Your response has been submitted to HR.');
    setResponse('');
    await reload();
  };

  const submitAppeal = async (caseId) => {
    if (!appealGrounds.trim()) return;
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch(`/api/hr/my/discipline-cases/${encodeURIComponent(caseId)}/appeal`, {
      method: 'POST',
      body: JSON.stringify({ grounds: appealGrounds.trim() }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not file appeal.');
      return;
    }
    setMessage('Your appeal has been submitted.');
    setAppealGrounds('');
    await reload();
  };

  return (
    <ProfilePageBody>
      <ProfilePageIntro
        title="Conduct record"
        description="View cases addressed to you, submit written responses, and file appeals when permitted. Records are confidential."
        actions={
          cases.length > 0 ? (
            <ProfileStatusChip variant="pending">{cases.length} on file</ProfileStatusChip>
          ) : (
            <ProfileStatusChip variant="approved">No active cases</ProfileStatusChip>
          )
        }
      />

      <HrConfidentialBanner>
        Conduct records are confidential. Do not discuss case details in open areas or share screenshots.
      </HrConfidentialBanner>

      {loadError ? <ProfileInlineAlert variant="error">{loadError}</ProfileInlineAlert> : null}
      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}
      {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}

      <ProfileOverviewSection title="Your cases" subtitle="Tap a case to expand details and respond">
        {loading && !cases.length ? <ProfileMetricSkeleton count={1} /> : null}
        {!loading && !cases.length ? (
          <ProfileEmptyState
            title="No conduct cases"
            description="You have no conduct cases on record. If HR opens a case, it will appear here."
            actionTo="/my-profile/documents"
            actionLabel="My documents"
          />
        ) : null}

        <ul className="space-y-2">
          {cases.map((c) => {
            const variant = STATUS_VARIANT[c.status] || 'neutral';
            const expanded = selected === c.id;
            const canRespond = ['open', 'awaiting_employee_response'].includes(c.status);
            const canAppeal =
              (c.appealStatus === 'open' || c.status === 'awaiting_appeal') &&
              c.appealStatus !== 'pending' &&
              !['upheld', 'rejected'].includes(String(c.appealStatus || ''));
            return (
              <li key={c.id} className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left"
                  onClick={() => selectCase(c.id)}
                >
                  <ProfileListRow className="!border-0 !bg-transparent !shadow-none !p-0">
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-900">{c.caseNumber || c.id}</span>
                      <span className="text-xs text-slate-500">
                        {c.caseType || 'Conduct'} · {c.severity || '—'}
                      </span>
                    </span>
                    <ProfileStatusChip variant={variant}>{c.status}</ProfileStatusChip>
                  </ProfileListRow>
                  {c.summary ? <p className="mt-2 text-sm text-slate-700">{c.summary}</p> : null}
                </button>

                {expanded ? (
                  <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 text-sm">
                    {c.description ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Details</p>
                        <p className="whitespace-pre-wrap text-slate-700">{c.description}</p>
                      </div>
                    ) : null}
                    {c.managementDecision ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Decision</p>
                        <p className="whitespace-pre-wrap text-slate-700">{c.managementDecision}</p>
                      </div>
                    ) : null}
                    {c.employeeResponse ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your response</p>
                        <p className="whitespace-pre-wrap text-slate-700">{c.employeeResponse}</p>
                      </div>
                    ) : null}

                    {canRespond ? (
                      <div className="space-y-2">
                        <ProfileFormField label="Written response" htmlFor={`response-${c.id}`}>
                          <textarea
                            id={`response-${c.id}`}
                            className="z-input min-h-[96px]"
                            rows={4}
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                          />
                        </ProfileFormField>
                        <button
                          type="button"
                          disabled={busy || !response.trim()}
                          onClick={() => submitResponse(c.id)}
                          className={HR_BTN_PRIMARY}
                        >
                          Submit response
                        </button>
                      </div>
                    ) : null}

                    {canAppeal ? (
                      <div className="space-y-2">
                        <ProfileFormField label="Appeal grounds" htmlFor={`appeal-${c.id}`}>
                          <textarea
                            id={`appeal-${c.id}`}
                            className="z-input min-h-[72px]"
                            rows={3}
                            value={appealGrounds}
                            onChange={(e) => setAppealGrounds(e.target.value)}
                          />
                        </ProfileFormField>
                        <button
                          type="button"
                          disabled={busy || !appealGrounds.trim()}
                          onClick={() => submitAppeal(c.id)}
                          className={HR_BTN_SECONDARY}
                        >
                          Submit appeal
                        </button>
                      </div>
                    ) : null}

                    <p className="z-meta-text">
                      Approved letters addressed to you appear in{' '}
                      <Link to="/my-profile/documents" className="font-semibold text-[#134e4a] hover:underline">
                        My documents
                      </Link>
                      .
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
