import React from 'react';
import { HrDailyRollPanel } from '../../components/hr/HrDailyRollPanel';
import { HrAbsenceReportsPanel } from '../../components/hr/HrAbsenceReportsPanel';
import { HrOvertimeRequestsPanel } from '../../components/hr/HrOvertimeRequestsPanel';

export default function TeamHrAttendance() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Record daily attendance for your branch. Salary figures are not shown on this screen.
      </p>
      <HrDailyRollPanel />
      <HrAbsenceReportsPanel branchScoped canReview={false} />
      <HrOvertimeRequestsPanel branchScoped />
    </div>
  );
}
