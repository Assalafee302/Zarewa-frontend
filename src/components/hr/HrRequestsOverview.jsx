import { useHrDashboardCounts } from '../../hooks/useHrDashboardCounts';
import { hrRequestQueuePath } from '../../lib/hrDashboardUi';
import { hrTimeAbsencePath } from '../../lib/hrRoutes';
import { Link } from 'react-router-dom';

/**
 * HQ requests workflow overview tiles — pending counts per queue stage.
 * @param {{
 *   canReview?: boolean;
 *   canEndorse?: boolean;
 *   canGm?: boolean;
 * }} props
 */
export default function HrRequestsOverview({ canReview, canEndorse, canGm }) {
  const { counts, loading: busy } = useHrDashboardCounts();

  const tiles = [
    canReview && {
      label: 'HR review',
      value: counts.pendingHrReview,
      href: hrRequestQueuePath('hr_queue'),
      tone: 'border-amber-200 bg-amber-50 text-amber-950',
    },
    canEndorse && {
      label: 'Branch endorsements',
      value: counts.pendingBranchEndorse,
      href: hrRequestQueuePath('endorse_queue'),
      tone: 'border-teal-200 bg-teal-50/50 text-teal-950',
    },
    canGm && {
      label: 'GM HR final',
      value: counts.pendingGmHrReview,
      href: hrRequestQueuePath('gm_queue'),
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-950',
    },
    {
      label: 'Overdue (SLA)',
      value: counts.overdueRequests,
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
