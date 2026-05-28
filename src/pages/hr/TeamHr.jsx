import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import HrPlaceholder from './HrPlaceholder';

const NAV = [
  { to: '/team-hr/staff', label: 'Team staff', end: true },
  { to: '/team-hr/attendance', label: 'Daily attendance' },
  { to: '/team-hr/requests', label: 'Requests' },
  { to: '/team-hr/leave-calendar', label: 'Leave calendar' },
  { to: '/team-hr/incidents', label: 'Incident memos' },
  { to: '/team-hr/transfers', label: 'Transfers' },
];

export default function TeamHr() {
  return (
    <Routes>
      <Route
        element={
          <HrSectionShell
            title="Team HR"
            subtitle="Branch manager tools — attendance, endorsements, and team coverage. Salary and payroll values are not shown here."
            navItems={NAV}
          />
        }
      >
        <Route index element={<Navigate to="staff" replace />} />
        <Route path="staff" element={<HrPlaceholder section="Team staff" detail="Branch staff list without salary columns." />} />
        <Route path="attendance" element={<HrPlaceholder section="Daily attendance" detail="Mark in-time, out-time, and status for your branch team." />} />
        <Route path="requests" element={<HrPlaceholder section="Requests to endorse" />} />
        <Route path="leave-calendar" element={<HrPlaceholder section="Team leave calendar" />} />
        <Route path="incidents" element={<HrPlaceholder section="Incident memos" detail="Raise incident memos that can become discipline cases in HR." />} />
        <Route path="transfers" element={<HrPlaceholder section="Transfer recommendations" />} />
      </Route>
    </Routes>
  );
}
