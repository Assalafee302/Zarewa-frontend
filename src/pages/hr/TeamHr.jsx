import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import TeamHrStaff from './TeamHrStaff';
import TeamHrLeaveCalendar from './TeamHrLeaveCalendar';
import TeamHrIncidents from './TeamHrIncidents';
import TeamHrTransfers from './TeamHrTransfers';
import TeamHrRequests from './TeamHrRequests';
import TeamHrAttendance from './TeamHrAttendance';

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
        <Route path="staff" element={<TeamHrStaff />} />
        <Route path="attendance" element={<TeamHrAttendance />} />
        <Route path="requests" element={<TeamHrRequests />} />
        <Route path="leave-calendar" element={<TeamHrLeaveCalendar />} />
        <Route path="incidents" element={<TeamHrIncidents />} />
        <Route path="transfers" element={<TeamHrTransfers />} />
      </Route>
    </Routes>
  );
}
