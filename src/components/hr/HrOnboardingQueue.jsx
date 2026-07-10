import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { onboardingQueueFromStaff, profilePct } from '../../lib/hrStaffDirectoryUi';
import { HrEmptyState } from './hrPageUi';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

export function HrOnboardingQueue() {
  const [staff, setStaff] = React.useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff?cohort=employees&includeInactive=1');
    if (!ok || !data?.ok) {
      setStaff([]);
      return { error: data?.error || 'Could not load staff.', hasData: false };
    }
    setStaff(Array.isArray(data.staff) ? data.staff.filter((s) => s?.userId) : []);
    return { hasData: true };
  }, []);

  const queue = useMemo(() => onboardingQueueFromStaff(staff), [staff]);

  if (loading && !staff.length) {
    return <p className="text-sm text-slate-600">Loading onboarding queue…</p>;
  }
  if (error) {
    return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  }
  if (!queue.length) {
    return (
      <HrEmptyState
        title="No pending onboarding"
        description="Recent hires have complete profiles and handbook acknowledgements."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Staff hired in the last 90 days with incomplete profiles or pending handbook acknowledgement.
      </p>
      <AppTableWrap>
        <AppTable>
          <AppTableThead>
            <AppTableTh>Name</AppTableTh>
            <AppTableTh>Joined</AppTableTh>
            <AppTableTh>Branch</AppTableTh>
            <AppTableTh>Profile</AppTableTh>
            <AppTableTh>Handbook</AppTableTh>
            <AppTableTh />
          </AppTableThead>
          <AppTableBody>
            {queue.map((s) => (
              <AppTableTr key={s.userId}>
                <AppTableTd>
                  <Link
                    to={`${HR_EMPLOYEES}/${encodeURIComponent(s.userId)}?tab=lifecycle`}
                    className="font-semibold text-zarewa-teal hover:underline"
                  >
                    {s.displayName || s.username}
                  </Link>
                </AppTableTd>
                <AppTableTd>{s.dateJoinedIso?.slice(0, 10) || '—'}</AppTableTd>
                <AppTableTd>{s.branchId || '—'}</AppTableTd>
                <AppTableTd>{profilePct(s)}%</AppTableTd>
                <AppTableTd>{s.complianceBadges?.handbookAcknowledged ? 'Done' : 'Pending'}</AppTableTd>
                <AppTableTd>
                  <Link
                    to={`${HR_EMPLOYEES}/${encodeURIComponent(s.userId)}?tab=lifecycle`}
                    className="text-xs font-bold uppercase text-zarewa-teal hover:underline"
                  >
                    Open →
                  </Link>
                </AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
    </div>
  );
}
