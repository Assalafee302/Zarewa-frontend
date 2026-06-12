import React from 'react';
import { Link } from 'react-router-dom';
import { HrAbsenceReportsPanel } from '../../components/hr/HrAbsenceReportsPanel';
import { HrOvertimeRequestsPanel } from '../../components/hr/HrOvertimeRequestsPanel';

export default function TeamHrAttendance() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-teal-100 bg-teal-50/80 px-4 py-3 text-sm text-teal-950">
        <p>
          Mark daily present, late, or absent from{' '}
          <Link to="/manager?inbox=attendance" className="font-bold underline hover:text-[#134e4a]">
            Management → Staff attendance
          </Link>
          . Salary figures are not shown on this screen.
        </p>
      </div>
      <HrAbsenceReportsPanel branchScoped canReview={false} />
      <HrOvertimeRequestsPanel branchScoped />
    </div>
  );
}
