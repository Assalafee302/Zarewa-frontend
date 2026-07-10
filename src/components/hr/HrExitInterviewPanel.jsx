import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { HrCard } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';

const QUESTIONS = [
  { key: 'reasonForLeaving', label: 'Primary reason for leaving' },
  { key: 'jobSatisfaction', label: 'Overall job satisfaction (1–5)' },
  { key: 'managementFeedback', label: 'Feedback on management and leadership' },
  { key: 'compensationFeedback', label: 'Feedback on compensation and benefits' },
  { key: 'wouldRecommend', label: 'Would you recommend Zarewa as an employer?' },
  { key: 'improvements', label: 'What could we improve?' },
];

/**
 * Exit interview form tied to a clearance record.
 * @param {{ clearanceId: string; userId?: string; canEdit?: boolean }} props
 */
export function HrExitInterviewPanel({ clearanceId, userId, canEdit = false }) {
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!clearanceId) return;
    setLoading(true);
    const { ok, data } = await apiFetch(`/api/hr/exit-clearance/${encodeURIComponent(clearanceId)}/interview`);
    setLoading(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load exit interview.');
      return;
    }
    setResponses(data.interview?.responses || {});
  }, [clearanceId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch(`/api/hr/exit-clearance/${encodeURIComponent(clearanceId)}/interview`, {
      method: 'PUT',
      body: JSON.stringify({ userId, responses }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save exit interview.');
      return;
    }
    setMessage('Exit interview recorded.');
    await load();
  };

  if (loading) return <p className="text-sm text-slate-500">Loading exit interview…</p>;

  return (
    <HrCard title="Exit interview" subtitle="Structured feedback from departing staff">
      {message ? <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {canEdit ? (
        <form onSubmit={save} className="space-y-3">
          {QUESTIONS.map((q) => (
            <label key={q.key} className="block text-xs font-semibold text-slate-600">
              {q.label}
              <textarea
                className={`${HR_FIELD_CLASS} mt-1 min-h-[64px]`}
                value={responses[q.key] || ''}
                onChange={(e) => setResponses({ ...responses, [q.key]: e.target.value })}
              />
            </label>
          ))}
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Saving…' : 'Save exit interview'}
          </button>
        </form>
      ) : (
        <dl className="space-y-2 text-sm">
          {QUESTIONS.map((q) => (
            <div key={q.key}>
              <dt className="text-ui-xs font-bold uppercase tracking-wide text-slate-400">{q.label}</dt>
              <dd className="mt-0.5 text-slate-800">{responses[q.key] || '—'}</dd>
            </div>
          ))}
          {!Object.keys(responses).length ? <p className="text-slate-500">No exit interview recorded yet.</p> : null}
        </dl>
      )}
    </HrCard>
  );
}
