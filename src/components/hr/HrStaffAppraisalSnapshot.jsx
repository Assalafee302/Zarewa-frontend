import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchStaffAppraisalSummary } from '../../lib/hrStaffExtras';
import { HR_DEVELOPMENT } from '../../lib/hrRoutes';
import { HrCard } from './hrPageUi';

function scoreLabel(scores) {
  if (!scores || typeof scores !== 'object') return null;
  if (scores.overall != null) return String(scores.overall);
  if (scores.total != null) return String(scores.total);
  const vals = Object.values(scores).filter((v) => typeof v === 'number');
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return avg.toFixed(1);
}

export function HrStaffAppraisalSnapshot({ userId, compact = false }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { ok, data } = await fetchStaffAppraisalSummary(userId);
      if (cancelled) return;
      setLoading(false);
      if (ok && data?.ok) setSummary(data);
      else setSummary({ latest: null, history: [] });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <p className="text-sm text-slate-600">Loading appraisal…</p>;

  const latest = summary?.latest;
  if (!latest) {
    return (
      <HrCard title="Performance appraisal" subtitle="Latest cycle snapshot">
        <p className="text-sm text-slate-600">No appraisal form on file yet.</p>
        <Link to={`${HR_DEVELOPMENT}?tab=appraisals`} className="mt-2 inline-block text-xs font-bold text-[#134e4a] hover:underline">
          Open appraisals hub →
        </Link>
      </HrCard>
    );
  }

  const score = scoreLabel(latest.scores);

  if (compact) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm">
        <p className="text-xs font-semibold text-slate-500">Latest appraisal</p>
        <p className="mt-1 font-bold text-slate-900">
          {latest.cycleLabel || latest.cycleYear} · {latest.status}
          {score ? ` · Score ${score}` : ''}
        </p>
      </div>
    );
  }

  return (
    <HrCard
      title="Performance appraisal"
      subtitle={latest.cycleLabel || `Cycle ${latest.cycleYear}`}
      actions={
        <Link to={`${HR_DEVELOPMENT}?tab=appraisals`} className="text-xs font-bold text-[#134e4a] hover:underline">
          All appraisals →
        </Link>
      }
    >
      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-xs font-bold uppercase text-slate-400">Status</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{latest.status || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-400">Reviewer</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{latest.reviewerDisplayName || latest.reviewerUserId || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-400">Due by</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{latest.dueByIso?.slice(0, 10) || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-400">Score</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{score || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-400">MD confirmed</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{latest.mdConfirmed ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-400">Updated</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{latest.updatedAtIso?.slice(0, 10) || '—'}</dd>
        </div>
      </dl>
    </HrCard>
  );
}
