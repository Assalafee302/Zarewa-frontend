import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from '../../components/hr/hrFormStyles';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { HrConfidentialBanner } from '../../components/hr/HrSensitiveField';
import { ProfileFormField } from '../../components/profile/profileFormUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';

const STATUS_PILL = {
  open: 'bg-sky-50 text-sky-800 border-sky-200',
  awaiting_employee_response: 'bg-amber-50 text-amber-900 border-amber-200',
  appealed: 'bg-violet-50 text-violet-900 border-violet-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
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
    <HrPageBody>
      <HrPageIntro
        title="Discipline cases"
        description="View cases addressed to you, submit written responses, and file appeals when permitted."
      />

      <HrConfidentialBanner>
        Discipline records are confidential. Do not discuss case details in open areas or share screenshots.
      </HrConfidentialBanner>

      {loadError ? <ProfileInlineAlert variant="error">{loadError}</ProfileInlineAlert> : null}
      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}
      {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}

      <ProfileOverviewSection title="Your cases" subtitle="Tap a case to expand details and respond">
        {loading && !cases.length ? <ProfileMetricSkeleton count={1} /> : null}
        {!loading && !cases.length ? (
          <ProfileEmptyState
            title="No discipline cases"
            description="You have no discipline cases on record. If HR opens a case, it will appear here."
            actionTo="/my-profile/documents"
            actionLabel="My documents"
          />
        ) : null}

        <ul className="space-y-3">
          {cases.map((c) => {
            const pill = STATUS_PILL[c.status] || 'bg-slate-50 text-slate-700 border-slate-200';
            const expanded = selected === c.id;
            const canRespond = ['open', 'awaiting_employee_response'].includes(c.status);
            const canAppeal =
              (c.appealStatus === 'open' || c.status === 'awaiting_appeal') &&
              c.appealStatus !== 'pending' &&
              !['upheld', 'rejected'].includes(String(c.appealStatus || ''));
            return (
              <li key={c.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <button type="button" className="w-full text-left" onClick={() => selectCase(c.id)}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">{c.caseNumber || c.id}</p>
                      <p className="text-xs text-slate-500">
                        {c.caseType || 'Discipline'} · {c.severity || '—'}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${pill}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.summary ? <p className="mt-2 text-sm text-slate-700">{c.summary}</p> : null}
                </button>

                {expanded ? (
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
                    {c.description ? (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Details</p>
                        <p className="whitespace-pre-wrap text-slate-700">{c.description}</p>
                      </div>
                    ) : null}
                    {c.managementDecision ? (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Decision</p>
                        <p className="whitespace-pre-wrap text-slate-700">{c.managementDecision}</p>
                      </div>
                    ) : null}
                    {c.employeeResponse ? (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Your response</p>
                        <p className="whitespace-pre-wrap text-slate-700">{c.employeeResponse}</p>
                      </div>
                    ) : null}
                    {c.appealStatus ? (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Appeal status</p>
                        <p className="capitalize text-slate-700">
                          {c.appealStatus === 'pending'
                            ? 'Under review — HR will notify you when a decision is recorded.'
                            : c.appealStatus === 'upheld'
                              ? 'Upheld — see outcome below.'
                              : c.appealStatus === 'rejected'
                                ? 'Rejected — see outcome below.'
                                : c.appealStatus.replace(/_/g, ' ')}
                        </p>
                      </div>
                    ) : null}
                    {c.finalOutcome ? (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Outcome</p>
                        <p className="whitespace-pre-wrap text-slate-700">{c.finalOutcome}</p>
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

                    <p className="text-xs text-slate-500">
                      Approved letters addressed to you appear in{' '}
                      <Link to="/my-profile/documents" className="font-bold text-[#134e4a] hover:underline">
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
    </HrPageBody>
  );
}
