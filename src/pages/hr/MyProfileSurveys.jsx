import React, { useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchOpenEngagementSurveys, submitEngagementResponse } from '../../lib/hrEngagement';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

export default function MyProfileSurveys() {
  const [surveys, setSurveys] = useState([]);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const { reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchOpenEngagementSurveys();
    if (ok && data?.ok) setSurveys((data.surveys || []).filter((s) => !s.answered));
    else setSurveys([]);
    return { hasData: true };
  }, []);

  const submit = async (surveyId) => {
    setBusy(true);
    setMsg('');
    const { ok, data } = await submitEngagementResponse({ surveyId, answers: answers[surveyId] || {} });
    setBusy(false);
    if (!ok || !data?.ok) {
      setMsg(data?.error || 'Could not submit.');
      return;
    }
    setMsg('Thank you — your response was recorded.');
    await reload();
  };

  if (surveys.length === 0) {
    return <p className="text-sm text-slate-600">No open surveys right now. Check back when HR publishes a pulse survey.</p>;
  }

  return (
    <div className="space-y-6">
      {msg ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{msg}</div>
      ) : null}
      {surveys.map((survey) => (
        <div key={survey.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-[#134e4a]">{survey.title}</h3>
          {(survey.questions || []).map((q) => (
            <label key={q.id} className="block text-sm">
              <span className="font-semibold text-slate-700">{q.text}</span>
              {q.type === 'rating' ? (
                <select
                  className={`${HR_FIELD_CLASS} mt-1`}
                  value={answers[survey.id]?.[q.id] ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [survey.id]: { ...(prev[survey.id] || {}), [q.id]: Number(e.target.value) },
                    }))
                  }
                  required
                >
                  <option value="">Select…</option>
                  {Array.from({ length: q.scale || 5 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : (
                <textarea
                  className={`${HR_FIELD_CLASS} mt-1 min-h-[72px]`}
                  value={answers[survey.id]?.[q.id] ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [survey.id]: { ...(prev[survey.id] || {}), [q.id]: e.target.value },
                    }))
                  }
                />
              )}
            </label>
          ))}
          <button type="button" disabled={busy} onClick={() => submit(survey.id)} className={HR_BTN_PRIMARY}>
            {busy ? 'Submitting…' : 'Submit responses'}
          </button>
        </div>
      ))}
    </div>
  );
}
