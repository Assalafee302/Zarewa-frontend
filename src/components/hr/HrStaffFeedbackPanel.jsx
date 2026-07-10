import { InlineLoader } from '../../components/ui/PageLoader';
import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canManageHrStaff, hrHasPermission } from '../../lib/hrAccess';
import { createStaffFeedbackNote, fetchStaffFeedback } from '../../lib/hrStaffExtras';
import { HR_FIELD_CLASS } from './hrFormStyles';
import { HrCard, HrButton, HrAddButton } from './hrPageUi';

export function HrStaffFeedbackPanel({ userId }) {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const canAdd = canManageHrStaff(perms) || hrHasPermission(perms, 'hr.team.view');
  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const reload = async () => {
    setLoading(true);
    const { ok, data } = await fetchStaffFeedback(userId);
    setLoading(false);
    if (ok && data?.ok) setNotes(data.notes || []);
    else setNotes([]);
  };

  useEffect(() => {
    reload();
  }, [userId]);

  const submit = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (text.length < 3) {
      setErr('Enter at least 3 characters.');
      return;
    }
    setBusy(true);
    setErr('');
    const { ok, data } = await createStaffFeedbackNote({ subjectUserId: userId, body: text });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not save note.');
      return;
    }
    setBody('');
    await reload();
  };

  return (
    <HrCard title="HR notes & feedback" subtitle="Internal notes visible to HR and line managers">
      {loading ? <InlineLoader message="Loading notes…" /> : null}
      {!loading && !notes?.length ? (
        <p className="text-sm text-slate-600">No feedback notes recorded for this employee.</p>
      ) : null}
      {notes?.length ? (
        <ul className="mb-4 space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm">
              <p className="text-slate-800 whitespace-pre-wrap">{n.body}</p>
              <p className="mt-2 text-ui-xs font-semibold uppercase tracking-wide text-slate-400">
                {n.authorDisplayName || n.authorUserId || 'HR'}
                {n.createdAtIso ? ` · ${n.createdAtIso.slice(0, 16).replace('T', ' ')}` : ''}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {canAdd ? (
        <form onSubmit={submit} className="space-y-3 border-t border-slate-100 pt-4">
          {err ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
          ) : null}
          <label className="block text-xs font-semibold text-slate-600">
            Add note
            <textarea
              className={`${HR_FIELD_CLASS} mt-1 min-h-[80px]`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Performance note, coaching feedback, or HR observation…"
            />
          </label>
          <HrButton type="submit" disabled={busy} >
            {busy ? 'Saving…' : 'Save note'}
          </HrButton>
        </form>
      ) : null}
    </HrCard>
  );
}
