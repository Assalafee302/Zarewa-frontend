import React from 'react';
import { currentPeriodYyyymm } from '../../lib/hrRequests';

export default function MyAttendance() {
  const periodYyyymm = currentPeriodYyyymm();

  return (
    <div className="space-y-4 text-sm text-slate-700">
      <p>
        Your attendance is recorded by your branch manager on the daily roll. Current payroll month:{' '}
        <strong className="font-mono">{periodYyyymm}</strong>.
      </p>
      <p className="text-xs text-slate-500">
        If you were late or absent for an approved reason, your manager can endorse an attendance exception request
        before payroll is locked. Contact HR if you need a correction.
      </p>
    </div>
  );
}
