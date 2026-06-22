import React, { useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrAbsenceReportsPanel } from '../../components/hr/HrAbsenceReportsPanel';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import HrRequestsOverview from '../../components/hr/HrRequestsOverview';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrAttendanceUploadsPanel } from '../../components/hr/HrAttendanceUploadsPanel';
import { HrPublicHolidaysSection } from '../../components/hr/HrSettingsSections';
import { ProfileOverviewSection } from '../../components/profile/profileOverviewUi';
import {
  canEndorseBranchHr,
  canGmApproveHrRequests,
  canManageHrLeave,
  canMarkHrAttendance,
  canReviewHrRequests,
  hrHasPermission,
} from '../../lib/hrAccess';
import { HR_EMPLOYEES, HR_PAYROLL, hrStaffCreditPath, hrTabPath } from '../../lib/hrRoutes';
import HrAttendance from './HrAttendance';
import HrLeave from './HrLeave';
import HrLeaveCalendarPanel from './HrLeaveCalendarPanel';
import { HrSubViewTabs } from '../../components/hr/HrSubViewTabs';

const TAB_DEFINITIONS = [
  {
    id: 'overview',
    label: 'Overview',
    visible: (p) => canReviewHrRequests(p) || canEndorseBranchHr(p) || canGmApproveHrRequests(p),
  },
  {
    id: 'approvals',
    label: 'Approvals',
    visible: (p) => canReviewHrRequests(p) || canEndorseBranchHr(p) || canGmApproveHrRequests(p),
  },
  {
    id: 'balances',
    label: 'Balances',
    visible: (p) => canManageHrLeave(p) || canReviewHrRequests(p) || canGmApproveHrRequests(p),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    visible: (p) => canManageHrLeave(p) || canReviewHrRequests(p) || canGmApproveHrRequests(p),
  },
  {
    id: 'attendance',
    label: 'Attendance',
    visible: (p) =>
      canMarkHrAttendance(p) ||
      hrHasPermission(p, 'hr.attendance.manage') ||
      hrHasPermission(p, 'hr.attendance.upload'),
  },
  {
    id: 'holidays',
    label: 'Holidays',
    visible: (p) => canManageHrLeave(p) || canReviewHrRequests(p),
  },
  {
    id: 'year-end',
    label: 'Year-end',
    visible: (p) => canManageHrLeave(p),
  },
];

const ATTENDANCE_SECTIONS = [
  { id: 'uploads', label: 'Uploads' },
  { id: 'exceptions', label: 'Exceptions' },
  { id: 'deductions', label: 'Deduction preview' },
];

const TIME_ABSENCE_REQUEST_KINDS = ['leave', 'profile_change', 'attendance_exception'];

export default function HrTimeAbsenceHub() {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const canReview = canReviewHrRequests(perms);
  const canEndorse = canEndorseBranchHr(perms);
  const canGm = canGmApproveHrRequests(perms);

  const tabs = useMemo(() => TAB_DEFINITIONS.filter((t) => t.visible(perms)), [perms]);
  const tabIds = tabs.map((t) => t.id);
  const defaultTab = tabIds[0] || 'balances';
  const { tab, setTab, searchParams, setSearchParams } = useHrUrlTab(defaultTab, tabIds);

  const requestId = searchParams.get('requestId') || '';
  const scopeParam = searchParams.get('scope') || '';
  const kindParam = searchParams.get('kind') || '';
  const attendanceSectionRaw = searchParams.get('section') || 'uploads';
  const attendanceSection = ATTENDANCE_SECTIONS.some((s) => s.id === attendanceSectionRaw)
    ? attendanceSectionRaw
    : 'uploads';

  const allowedScopes = useMemo(() => {
    const scopes = [];
    if (canReview) scopes.push('hr_queue');
    if (canEndorse) scopes.push('endorse_queue');
    if (canGm) scopes.push('gm_queue');
    scopes.push('all');
    return scopes;
  }, [canReview, canEndorse, canGm]);

  const defaultScope = useMemo(() => {
    if (scopeParam && allowedScopes.includes(scopeParam)) return scopeParam;
    return allowedScopes[0] || 'all';
  }, [scopeParam, allowedScopes]);

  const setAttendanceSection = useCallback(
    (section) => {
      setTab('attendance', { section });
    },
    [setTab]
  );

  useEffect(() => {
    if (requestId && tab === 'overview') {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'approvals');
        if (!next.get('scope')) next.set('scope', defaultScope);
        return next;
      });
    }
  }, [requestId, tab, defaultScope, setSearchParams]);

  const approvalKindFilter = kindParam === 'leave' ? 'leave' : '';

  if (!tabs.length) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-6 text-sm text-amber-950">
        <p className="font-semibold">Time & absence access not granted</p>
        <p className="mt-1 text-xs">Your role does not include leave, attendance, or approval permissions. Contact HR admin if you need access.</p>
      </div>
    );
  }

  return (
    <HrTabbedPage
      title="Time & absence"
      tabs={tabs}
      tab={tab}
      onTabChange={(nextTab) => setTab(nextTab, { section: nextTab === 'attendance' ? attendanceSection : null, kind: null })}
      hub="time-absence"
      hubPrompt={
        tab === 'approvals'
          ? 'Summarize pending leave and profile-change requests in my approval queues.'
          : tab === 'attendance'
            ? 'Explain attendance exceptions and absence reports needing HR review.'
            : 'Summarize leave balances, calendar coverage, and time-off risks for this period.'
      }
      hubPageContext={{ timeAbsenceTab: tab }}
    >
      {tab === 'overview' ? (
        <div className="space-y-6">
          <ProfileOverviewSection title="Pending approvals">
            <HrRequestsOverview canReview={canReview} canEndorse={canEndorse} canGm={canGm} />
          </ProfileOverviewSection>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-600">
            <strong className="text-slate-800">Loan requests</strong> are approved under{' '}
            <Link to={hrStaffCreditPath()} className="font-semibold text-[#134e4a] hover:underline">
              Payroll → Staff loans & credit
            </Link>
            . Branch managers mark daily attendance from Management.
          </div>
        </div>
      ) : null}

      {tab === 'approvals' ? (
        <ProfileOverviewSection title="Approval queue">
          <HrRequestsPanel
            allowedScopes={allowedScopes}
            defaultScope={defaultScope}
            kindFilter={approvalKindFilter}
            kindsInclude={approvalKindFilter ? null : TIME_ABSENCE_REQUEST_KINDS}
            hideKindFilter={Boolean(approvalKindFilter)}
            staffLinkBase={HR_EMPLOYEES}
            focusRequestId={requestId}
            showStageBar
          />
        </ProfileOverviewSection>
      ) : null}

      {tab === 'balances' ? <HrLeave embedded /> : null}
      {tab === 'calendar' ? <HrLeaveCalendarPanel /> : null}

      {tab === 'attendance' ? (
        <div className="space-y-6">
          <HrSubViewTabs tabs={ATTENDANCE_SECTIONS} value={attendanceSection} onChange={setAttendanceSection} ariaLabel="Attendance sections" />
          {attendanceSection === 'uploads' ? <HrAttendanceUploadsPanel /> : null}
          {attendanceSection === 'exceptions' ? (
            <div className="space-y-6">
              <HrAttendance embedded activeTab="exceptions" hideInternalTabs showExceptionsOnly />
              <HrAbsenceReportsPanel />
            </div>
          ) : null}
          {attendanceSection === 'deductions' ? (
            <HrAttendance embedded activeTab="deductions" hideInternalTabs />
          ) : null}
        </div>
      ) : null}

      {tab === 'holidays' ? <HrPublicHolidaysSection embedded /> : null}
      {tab === 'year-end' ? <HrLeave embedded showYearEndOnly /> : null}
    </HrTabbedPage>
  );
}
