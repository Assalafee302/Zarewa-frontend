import React from 'react';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrAbsenceReportsPanel } from '../../components/hr/HrAbsenceReportsPanel';
import HrPhase2Placeholder from '../../components/hr/HrPhase2Placeholder';
import HrAttendance from './HrAttendance';

const TABS = [
  { id: 'uploads', label: 'Uploads' },
  { id: 'exceptions', label: 'Exceptions' },
  { id: 'deduction-preview', label: 'Deduction Preview' },
];
export default function HrAttendanceHub() {
  const { tab, setTab } = useHrUrlTab('uploads', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="Attendance & Time Book"
      description="Attendance uploads, exceptions, and payroll deduction preview. Branch managers mark daily attendance from Management."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'deduction-preview' ? (
        <HrAttendance embedded activeTab="deductions" hideInternalTabs />
      ) : null}
      {tab === 'uploads' ? (
        <HrPhase2Placeholder
          title="Attendance sheet uploads"
          purpose="Upload branch attendance spreadsheets for bulk import and reconciliation."
        />
      ) : null}
      {tab === 'exceptions' ? (
        <div className="space-y-6">
          <HrAttendance embedded activeTab="exceptions" hideInternalTabs showExceptionsOnly />
          <HrAbsenceReportsPanel />
        </div>
      ) : null}
    </HrTabbedPage>
  );
}
