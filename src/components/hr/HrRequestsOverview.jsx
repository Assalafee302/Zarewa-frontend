import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { hrRequestQueuePath } from '../../lib/hrDashboardUi';
import { hrTimeAbsencePath } from '../../lib/hrRoutes';

/**
 * HQ requests workflow overview tiles — pending counts per queue stage.
 * @param {{
 *   canReview?: boolean;
 *   canEndorse?: boolean;
 *   canGm?: boolean;
 * }} props
 */
export default function HrRequestsOverview({ canReview, canEndorse, canGm }) {
  const [stats, setStats] = useState({
    pendingHrReview: 0,
    pendingBranchEndorse: 0,
    pendingGmHrReview: 0,
    overdueRequests: 0,
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const { ok, data } = await apiFetch('/api/hr/dashboard');
    setBusy(false);
    if (!ok || !data?.ok) return;
    const summary = data.observability?.summary || {};
    const counts = data.inbox?.counts || {};
    setStats({
      pendingHrReview: Number(counts.pendingHrReview ?? summary.pendingHrReview) || 0,
      pendingBranchEndorse: Number(counts.pendingBranchEndorse ?? summary.pendingBranchEndorse) || 0,
      pendingGmHrReview: Number(counts.pendingGmHrReview ?? summary.pendingGmHrReview) || 0,
      overdueRequests: Number(counts.overdueRequests ?? summary.overdueRequests) || 0,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tiles = [
    canReview && {
      label: 'HR review',
      value: stats.pendingHrReview,
      href: hrRequestQueuePath('hr_queue'),
      tone: 'border-amber-200 bg-amber-50 text-amber-950',
    },
    canEndorse && {
      label: 'Branch endorsements',
      value: stats.pendingBranchEndorse,
      href: hrRequestQueuePath('endorse_queue'),
      tone: 'border-teal-200 bg-teal-50/50 text-teal-950',
    },
    canGm && {
      label: 'GM HR final',
      value: stats.pendingGmHrReview,
      href: hrRequestQueuePath('gm_queue'),
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-950',
    },
    {
      label: 'Overdue (SLA)',
      value: stats.overdueRequests,
      href: hrTimeAbsencePath('approvals', { scope: 'all' }),
      tone: 'border-red-200 bg-red-50 text-red-900',
    },
  ].filter(Boolean);

  if (!tiles.length) {
    return (
      <p className="text-sm text-slate-600">
        Submit → HR review → branch endorsement → GM HR approval. Use the pending queue to action requests.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <Link
          key={t.label}
          to={t.href}
          className={`block rounded-xl border px-4 py-3 text-left transition hover:shadow-sm no-underline ${t.tone} ${
            busy ? 'opacity-70 pointer-events-none' : ''
          }`}
        >
          <div className="text-2xl font-bold tabular-nums">{busy ? '…' : t.value}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-80">{t.label}</div>
        </Link>
      ))}
    </div>
  );
}
