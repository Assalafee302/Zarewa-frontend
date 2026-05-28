import React from 'react';
import { HrDailyRollPanel } from '../../components/hr/HrDailyRollPanel';

export default function TeamHrAttendance() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Record daily attendance for your branch. Salary figures are not shown on this screen.
      </p>
      <HrDailyRollPanel />
    </div>
  );
}
