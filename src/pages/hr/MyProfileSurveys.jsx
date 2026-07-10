import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { ProfileFormField } from '../../components/profile/profileFormUi';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ProfileStatusChip } from '../../components/profile/profileDesign';

const DEFAULT_QUESTIONS = [
  { id: 'q1', text: 'I understand what is expected of me at work.', type: 'rating', scale: 5 },
  { id: 'q2', text: 'I would recommend Zarewa as a place to work.', type: 'rating', scale: 5 },
  { id: 'q3', text: 'My line manager supports my development.', type: 'rating', scale: 5 },
  { id: 'q4', text: 'What should we improve? (optional)', type: 'text' },
];

export default function MyProfileSurveys() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/engagement/open');
      setLoading(false);
      if (ok && data?.ok) setSurveys(data.surveys || []);
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!active) return;
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch('/api/hr/engagement/responses', {
      method: 'POST',
      body: JSON.stringify({ surveyId: active.id, answers }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not submit response.');
      return;
    }
    setMessage('Thank you — your response has been recorded.');
    setActive(null);
    setSurveys((prev) => prev.map((s) => (s.id === active.id ? { ...s, answered: true } : s)));
  };

  const openCount = surveys.filter((s) => !s.answered).length;

  return (
    <ProfilePageBody>
      <ProfilePageIntro
        description="Participate in open surveys. Your feedback is confidential and helps HR improve the workplace."
        actions={
          openCount > 0 ? <ProfileStatusChip variant="pending">{openCount} open</ProfileStatusChip> : (
            <ProfileStatusChip variant="approved">All caught up</ProfileStatusChip>
          )
        }
      />

      {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}

      {!active ? (
        <ProfileOverviewSection title="Open surveys" subtitle="Select a survey to respond">
          {loading ? <ProfileMetricSkeleton count={1} /> : null}
          {!loading && !surveys.length ? (
            <ProfileEmptyState
              title="No open surveys"
              description="When HR publishes an engagement survey, it will appear here for you to complete."
            />
          ) : null}
          {!loading && surveys.length > 0 ? (
            <ul className="space-y-2">
              {surveys.map((s) => (
                <li key={s.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/60 bg-white/70 px-3 py-2.5 shadow-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{s.title}</p>
                      <p className="text-xs text-slate-500">
                        {s.closesAtIso ? `Closes ${s.closesAtIso.slice(0, 10)}` : 'Open'}
                      </p>
                    </div>
                    {s.answered ? (
                      <ProfileStatusChip variant="approved">Submitted</ProfileStatusChip>
                    ) : (
                      <HrButton
                        type="button"
                        
                        onClick={() => {
                          setActive(s);
                          setAnswers({});
                          setError('');
                        }}
                      >
                        Respond
                      </HrButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </ProfileOverviewSection>
      ) : (
        <ProfileOverviewSection title={active.title} subtitle="All responses are confidential">
          <form onSubmit={submit} className="space-y-4">
            {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}
            {(active.questions?.length ? active.questions : DEFAULT_QUESTIONS).map((q) => (
              <ProfileFormField key={q.id} label={q.text} htmlFor={`survey-${q.id}`}>
                {q.type === 'rating' ? (
                  <select
                    id={`survey-${q.id}`}
                    className={HR_FIELD_CLASS}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: Number(e.target.value) }))}
                    required
                  >
                    <option value="">Select rating</option>
                    {Array.from({ length: q.scale || 5 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                ) : (
                  <textarea
                    id={`survey-${q.id}`}
                    className={`${HR_FIELD_CLASS} min-h-[72px]`}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  />
                )}
              </ProfileFormField>
            ))}
            <div className="flex flex-col gap-2 sm:flex-row">
              <HrButton type="submit" disabled={busy} >
                {busy ? 'Submitting…' : 'Submit response'}
              </HrButton>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="z-btn-secondary min-h-11"
              >
                Cancel
              </button>
            </div>
          </form>
        </ProfileOverviewSection>
      )}
    </ProfilePageBody>
  );
}
