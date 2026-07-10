import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/hrFormat';
import { currentPeriodYyyymm } from '../../lib/hrRequests';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { WorkPayHero } from '../../components/profile/WorkPayHero';
import { WorkPayFilterBar } from '../../components/profile/workPayFormUi';
import { ProfilePageBody } from '../../components/profile/profilePageUi';
import { ProfileInlineAlert, ProfileOverviewSection, ProfileEmptyState } from '../../components/profile/profileOverviewUi';
import { ProfileKpiCard, ProfileListRow, ProfileStatusChip } from '../../components/profile/profileDesign';
import { ProfileProbationBanner } from '../../components/profile/ProfileProbationBanner';
import { ProfileFormField } from '../../components/profile/profileFormUi';
import { MyAttendanceExceptionModal } from '../../components/hr/MyAttendanceExceptionModal';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';

const STATUS_VARIANT = {
  present: 'approved',
  late: 'pending',
  absent: 'rejected',
};

function periodInputValue(yyyymm) {
  const s = String(yyyymm || '');
  if (s.length !== 6) return '';
  return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
}

function periodFromInput(val) {
  return String(val || '').replace('-', '');
}

export default function MyAttendance({ embedded = false }) {
  const [period, setPeriod] = useState(currentPeriodYyyymm());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiFetch(`/api/hr/me/attendance-summary?periodYyyymm=${encodeURIComponent(period)}`);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load attendance.');
      setSummary(null);
    } else {
      setSummary(data);
      setError('');
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const effAbsent = Math.max(
    0,
    (summary?.absentDays || 0) - (summary?.leaveWaiveWorkingDays || 0) - (summary?.absentExceptions || 0)
  );
  const effLate = Math.max(0, (summary?.lateDays || 0) - (summary?.lateExceptions || 0));

  const content = (
    <>
      {!embedded ? (
        <WorkPayHero
          eyebrow="Work & pay"
          title="Attendance"
          description="See how your branch manager marked you this month, estimated payroll impact, and request an exception before payroll locks."
          action={<MyAttendanceExceptionModal onSubmitted={() => { setMessage('Exception submitted for manager review.'); void load(); }} />}
        />
      ) : null}

      {!embedded ? <ProfileProbationBanner /> : null}
      {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}
      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}

      <WorkPayFilterBar>
        <ProfileFormField label="Payroll month" className="mb-0">
          <input
            type="month"
            className="z-input max-w-[12rem]"
            value={periodInputValue(period)}
            onChange={(e) => setPeriod(periodFromInput(e.target.value) || currentPeriodYyyymm())}
          />
        </ProfileFormField>
      </WorkPayFilterBar>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileKpiCard label="Absent days (roll)">
              <p className="text-2xl font-black tabular-nums text-slate-900">{summary.absentDays ?? 0}</p>
            </ProfileKpiCard>
            <ProfileKpiCard label="Late days">
              <p className="text-2xl font-black tabular-nums text-slate-900">{summary.lateDays ?? 0}</p>
            </ProfileKpiCard>
            <ProfileKpiCard label="After leave & exceptions">
              <p className="text-sm text-slate-600">
                {effAbsent} absent · {effLate} late
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {summary.leaveWaiveWorkingDays ? `${summary.leaveWaiveWorkingDays} day(s) waived by approved leave` : 'No leave waiver'}
              </p>
            </ProfileKpiCard>
            <ProfileKpiCard label="Est. payroll deduction">
              <p className="text-2xl font-black tabular-nums text-zarewa-teal">{formatNgn(summary.deductionNgn || 0)}</p>
              {summary.deductionNgn > 0 ? (
                <Link to={HR_SELF_SERVICE_PATH.payslips} className="mt-2 inline-block text-xs font-semibold text-zarewa-teal hover:underline">
                  Check payslip →
                </Link>
              ) : null}
            </ProfileKpiCard>
          </div>

          {summary.monthlyAbsentDays != null ? (
            <ProfileInlineAlert variant="info">
              Monthly attendance upload for your branch records <strong>{summary.monthlyAbsentDays}</strong> absent day(s)
              for this period.
            </ProfileInlineAlert>
          ) : null}

          <ProfileOverviewSection title="Daily roll" subtitle="Present, late, or absent marks from your branch manager">
            {summary.days?.length ? (
              <div className="space-y-1">
                {summary.days.map((d) => (
                  <ProfileListRow key={d.dayIso}>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{d.dayIso}</span>
                      {d.remark ? <span className="text-xs text-slate-500">{d.remark}</span> : null}
                    </span>
                    <ProfileStatusChip variant={STATUS_VARIANT[d.status] || 'neutral'}>{d.status}</ProfileStatusChip>
                  </ProfileListRow>
                ))}
              </div>
            ) : (
              <ProfileEmptyState
                title="No roll marks yet"
                description="Your branch manager marks daily attendance in Management. Use Request exception above if you need a day waived before payroll locks."
              />
            )}
          </ProfileOverviewSection>

          {summary.exceptions?.length ? (
            <ProfileOverviewSection title="Your exception requests" subtitle="Pending and past attendance exceptions">
              <ul className="space-y-2">
                {summary.exceptions.map((ex) => (
                  <li
                    key={ex.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm"
                  >
                    <span>
                      <span className="font-semibold text-slate-900">{ex.dayIso || '—'}</span>
                      <span className="ml-2 text-xs capitalize text-slate-500">{ex.type || 'exception'}</span>
                    </span>
                    <ProfileStatusChip
                      variant={
                        ex.status === 'approved' ? 'approved' : ex.status === 'rejected' ? 'rejected' : 'pending'
                      }
                    >
                      {String(ex.status || 'pending').replace(/_/g, ' ')}
                    </ProfileStatusChip>
                  </li>
                ))}
              </ul>
            </ProfileOverviewSection>
          ) : null}
        </>
      ) : null}

      <ProfileOverviewSection title="Exception requests" subtitle="Track submissions awaiting branch endorsement">
        <HrRequestsPanel allowedScopes={['mine']} defaultScope="mine" kindFilter="attendance_exception" staffLinkBase="/my-profile" showStageBar />
      </ProfileOverviewSection>
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Monthly roll marks and payroll impact for your branch.</p>
          <MyAttendanceExceptionModal onSubmitted={() => { setMessage('Exception submitted for manager review.'); void load(); }} />
        </div>
        {content}
      </div>
    );
  }

  return <ProfilePageBody>{content}</ProfilePageBody>;
}
