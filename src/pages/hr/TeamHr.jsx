import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import { TEAM_HR_TIME_ABSENCE } from '../../lib/teamHrRoutes';
import {
  TeamHrAttendanceLegacyRedirect,
  TeamHrLeaveCalendarLegacyRedirect,
  TeamHrRequestsLegacyRedirect,
} from './TeamHrLegacyRedirects';
import TeamHrStaff from './TeamHrStaff';
import TeamHrIncidents from './TeamHrIncidents';
import TeamHrTransfers from './TeamHrTransfers';
import TeamHrTimeAbsenceHub from './TeamHrTimeAbsenceHub';
import TeamHrHome from './TeamHrHome';

const NAV = [
  { to: '/team-hr', label: 'Dashboard', end: true },
  { to: '/team-hr/staff', label: 'Team staff' },
  { to: TEAM_HR_TIME_ABSENCE, label: 'Time & absence' },
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
            subtitle="Branch manager tools — endorsements, team coverage, and absence. Salary and payroll values are not shown here."
            navItems={NAV}
            stickySubnav
            compact
          />
        }
      >
        <Route index element={<TeamHrHome />} />
        <Route path="staff" element={<TeamHrStaff />} />
        <Route path="time-absence" element={<TeamHrTimeAbsenceHub />} />
        <Route path="attendance" element={<TeamHrAttendanceLegacyRedirect />} />
        <Route path="requests" element={<TeamHrRequestsLegacyRedirect />} />
        <Route path="leave-calendar" element={<TeamHrLeaveCalendarLegacyRedirect />} />
        <Route path="incidents" element={<TeamHrIncidents />} />
        <Route path="transfers" element={<TeamHrTransfers />} />
      </Route>
    </Routes>
  );
}
