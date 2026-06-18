import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../../lib/apiBase';
import {
  downloadEmploymentLetterPdf,
  gmReviewHrLetter,
  hrReviewHrLetter,
  issueHrLetter,
  mdApproveHrLetter,
  submitHrLetter,
} from '../../lib/hrExtended';
import { HrCard } from './hrPageUi';
import { HR_BTN_SECONDARY } from './hrFormStyles';

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

function LetterRow({ letter, canManage, canApprove, busyId, onRun }) {
  const id = letter.id;
  const busy = busyId === id;
  const status = String(letter.status || 'draft');
  const canSubmit = canManage && ['draft', 'rejected'].includes(status);
  const canHrApprove = canApprove && status === 'submitted';
  const canGmApprove = canApprove && status === 'gm_review';
  const canMdApprove = canApprove && status === 'md_review';
  const canIssue = canApprove && status === 'approved';
  const canPdf = ['approved', 'issued'].includes(status);

  return (
    <li className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-800">{letter.staffDisplayName || letter.userId || 'Staff'}</div>
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
            className="text-xs font-semibold text-sky-800 hover:underline disabled:opacity-50"
            onClick={() => onRun(id, 'submit')}
          >
            {busy ? 'Working…' : 'Submit for review'}
          </button>
        ) : null}
        {canHrApprove ? (
          <button
            type="button"
            disabled={busy}
            className="text-xs font-semibold text-indigo-800 hover:underline disabled:opacity-50"
            onClick={() => onRun(id, 'hr_approve')}
          >
            {busy ? 'Working…' : 'HR approve'}
          </button>
        ) : null}
        {canGmApprove ? (
          <button
            type="button"
            disabled={busy}
            className="text-xs font-semibold text-violet-800 hover:underline disabled:opacity-50"
            onClick={() => onRun(id, 'gm_approve')}
          >
            {busy ? 'Working…' : 'GM approve'}
          </button>
        ) : null}
        {canMdApprove ? (
          <button
            type="button"
            disabled={busy}
            className="text-xs font-semibold text-purple-800 hover:underline disabled:opacity-50"
            onClick={() => onRun(id, 'md_approve')}
          >
            {busy ? 'Working…' : 'MD approve'}
          </button>
        ) : null}
        {canIssue ? (
          <button
            type="button"
            disabled={busy}
            className="text-xs font-semibold text-teal-800 hover:underline disabled:opacity-50"
            onClick={() => onRun(id, 'issue')}
          >
            {busy ? 'Working…' : 'Issue letter'}
          </button>
        ) : null}
        {canPdf ? (
          <button
            type="button"
            disabled={busy}
            className="text-xs font-semibold text-teal-800 hover:underline disabled:opacity-50"
            onClick={() => onRun(id, 'pdf')}
          >
            {busy ? 'Working…' : 'Download PDF'}
          </button>
        ) : null}
        <Link
          to={`/hr/documents?tab=letters&letterId=${encodeURIComponent(id)}`}
          className="text-xs font-semibold text-slate-600 hover:underline"
        >
          Open in Documents
        </Link>
      </div>
    </li>
  );
}

export default function HrCasePartyLettersPanel({ detail, canManage, canApprove, onUpdated }) {
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const letters = useMemo(() => {
    if (Array.isArray(detail?.relatedLetters) && detail.relatedLetters.length) {
      return detail.relatedLetters;
    }
    return (detail?.relatedLetterIds || []).map((id) => ({ id, status: 'draft', letterKind: 'salary_recovery' }));
  }, [detail?.relatedLetters, detail?.relatedLetterIds]);

  const { requiredLetters, otherLetters } = useMemo(() => {
    const decisionType = String(detail?.decisionType || '').trim();
    if (decisionType === 'deduction') {
      const required = letters.filter((l) => String(l.letterKind) === 'salary_recovery');
      const requiredIds = new Set(required.map((l) => l.id));
      const other = letters.filter((l) => !requiredIds.has(l.id));
      return { requiredLetters: required, otherLetters: other };
    }
    return { requiredLetters: letters, otherLetters: [] };
  }, [letters, detail?.decisionType]);

  if (!letters.length) return null;

  const draftRequired = requiredLetters.filter((l) => ['draft', 'rejected'].includes(String(l.status || '')));

  const submitAllDrafts = async () => {
    if (!canManage || !draftRequired.length) return;
    setErr('');
    setMsg('');
    setBusyId('batch');
    for (const letter of draftRequired) {
      const result = await submitHrLetter(letter.id);
      if (!result?.ok) {
        setBusyId('');
        setErr(result?.error || `Failed to submit ${letter.id}`);
        return;
      }
    }
    setBusyId('');
    setMsg(`Submitted ${draftRequired.length} letter(s) for approval.`);
    onUpdated?.();
  };

  const run = async (letterId, action) => {
    setBusyId(letterId);
    setMsg('');
    setErr('');
    let result;
    if (action === 'submit') result = await submitHrLetter(letterId);
    else if (action === 'hr_approve') result = await hrReviewHrLetter(letterId, { approve: true });
    else if (action === 'gm_approve') result = await gmReviewHrLetter(letterId, { approve: true });
    else if (action === 'md_approve') result = await mdApproveHrLetter(letterId, { approve: true });
    else if (action === 'issue') result = await issueHrLetter(letterId);
    else if (action === 'pdf') result = await downloadEmploymentLetterPdf(letterId);
    setBusyId('');
    if (!result?.ok) {
      setErr(result?.error || 'Action failed.');
      return;
    }
    const labels = {
      submit: 'submitted for review',
      hr_approve: 'HR approved',
      gm_approve: 'GM approved',
      md_approve: 'MD approved',
      issue: 'issued',
      pdf: 'downloaded',
    };
    setMsg(action === 'pdf' ? 'PDF downloaded.' : `Letter ${labels[action] || 'updated'}.`);
    onUpdated?.();
  };

  return (
    <HrCard
      title="Recovery / sanction letters"
      subtitle="Submit each letter, then HR → GM → MD approve, then Issue — required before Close case"
    >
      {msg ? <p className="text-sm text-emerald-800 mb-2">{msg}</p> : null}
      {err ? <p className="text-sm text-red-700 mb-2">{err}</p> : null}
      {canManage ? (
        <p className="mb-3 text-xs text-slate-600 rounded-lg bg-slate-50 border border-slate-100 p-2">
          <strong>HR:</strong> click <em>Submit for review</em> on each draft letter below (or use stage{' '}
          <strong>8. Close</strong> on the case).
        </p>
      ) : null}
      {canApprove && !canManage ? (
        <p className="mb-3 text-xs text-violet-900 rounded-lg bg-violet-50 border border-violet-100 p-2">
          <strong>GM / MD:</strong> open this case from <strong>Staff cases &amp; exit → Cases</strong>, or use{' '}
          <Link to="/hr/documents?tab=letters&filter=awaiting_approval" className="font-semibold underline">
            Documents → Letters (awaiting approval)
          </Link>
          . Approve each recovery letter, then HR issues it.
        </p>
      ) : null}
      {canManage && draftRequired.length > 1 ? (
        <button
          type="button"
          disabled={busyId === 'batch'}
          className={`mb-3 ${HR_BTN_SECONDARY}`}
          onClick={submitAllDrafts}
        >
          {busyId === 'batch' ? 'Submitting…' : `Submit all ${draftRequired.length} drafts for review`}
        </button>
      ) : null}
      {requiredLetters.length ? (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-2">
            Required for case closure
          </p>
          <ul className="space-y-2 text-sm">
            {requiredLetters.map((letter) => (
              <LetterRow
                key={letter.id}
                letter={letter}
                canManage={canManage}
                canApprove={canApprove}
                busyId={busyId}
                onRun={run}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {otherLetters.length ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
            Other linked letters (not required to close)
          </p>
          <ul className="space-y-2 text-sm">
            {otherLetters.map((letter) => (
              <LetterRow
                key={letter.id}
                letter={letter}
                canManage={canManage}
                canApprove={canApprove}
                busyId={busyId}
                onRun={run}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </HrCard>
  );
}
