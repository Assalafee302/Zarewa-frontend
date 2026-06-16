import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../../lib/apiBase';
import {
  downloadEmploymentLetterPdf,
  issueHrLetter,
  submitHrLetter,
} from '../../lib/hrExtended';
import { HrCard } from './hrPageUi';

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'issued') return 'bg-emerald-100 text-emerald-800';
  if (s === 'approved') return 'bg-teal-100 text-teal-900';
  if (s === 'rejected') return 'bg-rose-100 text-rose-800';
  if (['submitted', 'hr_review', 'gm_review', 'md_review'].includes(s)) return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

function kindLabel(kind) {
  return String(kind || 'letter').replace(/_/g, ' ');
}

export default function HrCasePartyLettersPanel({ detail, canManage, onUpdated }) {
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const letters = useMemo(() => {
    if (Array.isArray(detail?.relatedLetters) && detail.relatedLetters.length) {
      return detail.relatedLetters;
    }
    return (detail?.relatedLetterIds || []).map((id) => ({ id, status: 'draft', letterKind: 'salary_recovery' }));
  }, [detail?.relatedLetters, detail?.relatedLetterIds]);

  if (!letters.length) return null;

  const run = async (letterId, action) => {
    setBusyId(letterId);
    setMsg('');
    setErr('');
    let result;
    if (action === 'submit') result = await submitHrLetter(letterId);
    else if (action === 'issue') result = await issueHrLetter(letterId);
    else if (action === 'pdf') result = await downloadEmploymentLetterPdf(letterId);
    setBusyId('');
    if (!result?.ok) {
      setErr(result?.error || 'Action failed.');
      return;
    }
    setMsg(action === 'pdf' ? 'PDF downloaded.' : `Letter ${action === 'issue' ? 'issued' : 'submitted for review'}.`);
    onUpdated?.();
  };

  return (
    <HrCard
      title="Recovery / sanction letters"
      subtitle="Per-party draft letters — submit for approval, issue, then download the official PDF"
    >
      {msg ? <p className="text-sm text-emerald-800 mb-2">{msg}</p> : null}
      {err ? <p className="text-sm text-red-700 mb-2">{err}</p> : null}
      <ul className="space-y-2 text-sm">
        {letters.map((letter) => {
          const id = letter.id;
          const busy = busyId === id;
          const status = String(letter.status || 'draft');
          const canSubmit = canManage && ['draft', 'rejected'].includes(status);
          const canIssue = canManage && status === 'approved';
          const canPdf = ['approved', 'issued'].includes(status);

          return (
            <li key={id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800">
                    {letter.staffDisplayName || letter.userId || 'Staff'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {kindLabel(letter.letterKind)} · <span className="font-mono">{id}</span>
                    {letter.referenceNumber ? ` · ref ${letter.referenceNumber}` : ''}
                  </div>
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusTone(status)}`}>
                  {status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={apiUrl(`/api/hr/employment-letters/${encodeURIComponent(id)}/preview`)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-teal-800 hover:underline"
                >
                  Preview
                </a>
                {canSubmit ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs font-semibold text-teal-800 hover:underline disabled:opacity-50"
                    onClick={() => run(id, 'submit')}
                  >
                    {busy ? 'Working…' : 'Submit for review'}
                  </button>
                ) : null}
                {canIssue ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs font-semibold text-teal-800 hover:underline disabled:opacity-50"
                    onClick={() => run(id, 'issue')}
                  >
                    {busy ? 'Working…' : 'Issue letter'}
                  </button>
                ) : null}
                {canPdf ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs font-semibold text-teal-800 hover:underline disabled:opacity-50"
                    onClick={() => run(id, 'pdf')}
                  >
                    {busy ? 'Working…' : 'Download PDF'}
                  </button>
                ) : null}
                <Link
                  to={`/hr/documents?tab=letters&letterId=${encodeURIComponent(id)}`}
                  className="text-xs font-semibold text-slate-600 hover:underline"
                >
                  Full letter workflow
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {canManage ? (
        <p className="mt-3 text-xs text-slate-500">
          Draft letters must be approved through HR review before issue. Use &ldquo;Full letter workflow&rdquo; for GM/MD steps if required.
        </p>
      ) : null}
    </HrCard>
  );
}
