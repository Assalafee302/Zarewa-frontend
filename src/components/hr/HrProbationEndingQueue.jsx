import { InlineLoader } from '../../components/ui/PageLoader';
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchHrStaffDirectory } from '../../lib/hrStaffDirectoryApi';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrEmptyState } from './hrPageUi';

/**
 * Dashboard queue for managers — probation ending within 30 days in scope.
 */
export function HrProbationEndingQueue() {
  const [staff, setStaff] = React.useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrStaffDirectory({
      quickFilter: 'probation-ending',
      page: 1,
      pageSize: 8,
      status: 'active',
    });
    if (!ok || !data?.ok) {
      setStaff([]);
      return { error: data?.error || 'Could not load probation queue.', hasData: false };
    }
    setStaff(Array.isArray(data.staff) ? data.staff : []);
    return { hasData: true };
  }, []);

  const rows = useMemo(() => staff.filter((s) => s?.userId), [staff]);

  if (loading && !rows.length) {
    return <InlineLoader message="Loading probation queue…" />;
  }
  if (error) {
    return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  }
  if (!rows.length) return null;

  return (
    <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-amber-900">Probation decisions</h2>
          <p className="mt-1 text-xs text-amber-950/80">{rows.length} staff ending probation within 30 days</p>
        </div>
        <Link
          to={`${HR_EMPLOYEES}?tab=directory&quickFilter=probation-ending`}
          className="text-xs font-bold uppercase text-zarewa-teal hover:underline"
        >
          Directory filter →
        </Link>
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((s) => (
          <li
            key={s.userId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-xs"
          >
            <span className="font-semibold text-slate-800">{s.displayName || s.username}</span>
            <span className="font-mono text-amber-800">{s.probationEndIso?.slice(0, 10) || '—'}</span>
            <Link
              to={`${HR_EMPLOYEES}/${encodeURIComponent(s.userId)}?tab=employment`}
              className="font-bold text-zarewa-teal hover:underline"
            >
              Confirm / extend →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
