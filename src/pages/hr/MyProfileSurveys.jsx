import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { HrCard } from '../../components/hr/hrPageUi';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

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

  if (loading) return <p className="text-sm text-slate-500">Loading surveys…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Participate in open engagement surveys. Your feedback helps HR improve the workplace.</p>
      {message ? <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div> : null}

      {!active ? (
        <ul className="space-y-2">
          {!surveys.length ? (
            <li className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-sm text-slate-500 text-center">No open surveys at this time.</li>
          ) : null}
          {surveys.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="font-semibold text-slate-800">{s.title}</p>
                <p className="text-xs text-slate-500">
                  {s.closesAtIso ? `Closes ${s.closesAtIso.slice(0, 10)}` : 'Open'}
                  {s.answered ? ' · Completed' : ''}
                </p>
              </div>
              {!s.answered ? (
                <button type="button" onClick={() => { setActive(s); setAnswers({}); setError(''); }} className={HR_BTN_PRIMARY}>
                  Respond
                </button>
              ) : (
                <span className="text-xs font-bold uppercase text-emerald-700">Submitted</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <HrCard title={active.title} subtitle="All responses are confidential">
          <form onSubmit={submit} className="space-y-4">
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            {(active.questions?.length ? active.questions : DEFAULT_QUESTIONS).map((q) => (
              <label key={q.id} className="block text-sm">
                <span className="font-semibold text-slate-700">{q.text}</span>
                {q.type === 'rating' ? (
                  <select
                    className={`${HR_FIELD_CLASS} mt-1`}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: Number(e.target.value) }))}
                    required
                  >
                    <option value="">Select rating</option>
                    {Array.from({ length: q.scale || 5 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                ) : (
                  <textarea
                    className={`${HR_FIELD_CLASS} mt-1 min-h-[72px]`}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  />
                )}
              </label>
            ))}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>{busy ? 'Submitting…' : 'Submit response'}</button>
              <button type="button" onClick={() => setActive(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase">Cancel</button>
            </div>
          </form>
        </HrCard>
      )}
    </div>
  );
}
