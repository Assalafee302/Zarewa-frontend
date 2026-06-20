import React, { useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchHrLeaveCalendar } from '../../lib/hrExtended';
import { HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { HrPageBody } from '../../components/hr/hrPageUi';
import { ProfileFormField } from '../../components/profile/profileFormUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

function monthRange() {
  const d = new Date();
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 2, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function TeamHrLeaveCalendar({ embedded = false }) {
  const [{ from, to }, setRange] = useState(monthRange);
  const [entries, setEntries] = useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrLeaveCalendar(from, to);
    if (!ok || !data?.ok) {
      setEntries([]);
      return { error: data?.error || 'Could not load leave calendar.', hasData: false };
    }
    setEntries(data.entries || []);
    return { hasData: true };
  }, [from, to]);

  const body = (
    <>
      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}

      <div className="mb-4 flex flex-wrap gap-4">
        <ProfileFormField label="From" htmlFor="leave-from">
          <input
            id="leave-from"
            type="date"
            className={HR_FIELD_CLASS}
            value={from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </ProfileFormField>
        <ProfileFormField label="To" htmlFor="leave-to">
          <input
            id="leave-to"
            type="date"
            className={HR_FIELD_CLASS}
            value={to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </ProfileFormField>
      </div>

      <ProfileOverviewSection title="Approved leave" flush>
        {loading && !entries.length ? <ProfileMetricSkeleton count={1} /> : null}
        {!loading && !entries.length ? (
          <ProfileEmptyState title="No approved leave" description="No approved leave falls within the selected date range." />
        ) : (
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTh>Staff</AppTableTh>
                  <AppTableTh>Leave type</AppTableTh>
                  <AppTableTh>From</AppTableTh>
                  <AppTableTh>To</AppTableTh>
                  <AppTableTh align="right">Days</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {entries.map((e) => (
                  <AppTableTr key={e.requestId}>
                    <AppTableTd className="font-semibold">{e.displayName}</AppTableTd>
                    <AppTableTd>{e.leaveType}</AppTableTd>
                    <AppTableTd>{e.startDateIso}</AppTableTd>
                    <AppTableTd>{e.endDateIso}</AppTableTd>
                    <AppTableTd align="right">{e.daysRequested}</AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        )}
      </ProfileOverviewSection>
    </>
  );

  if (embedded) return <div className="space-y-6">{body}</div>;

  return (
    <HrPageBody>{body}</HrPageBody>
  );
}
