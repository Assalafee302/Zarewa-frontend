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
import TeamHrOrgChart from './TeamHrOrgChart';

const NAV = [
  { to: '/team-hr', label: 'Dashboard', end: true },
  { to: '/team-hr/staff', label: 'Team directory' },
  { to: '/team-hr/org-chart', label: 'Org chart' },
  { to: TEAM_HR_TIME_ABSENCE, label: 'Time & absence' },
  { to: '/team-hr/incidents', label: 'Incidents' },
  { to: '/team-hr/transfers', label: 'Transfers' },
];

export default function TeamHr() {
  return (
    <Routes>
      <Route
        element={
          <HrSectionShell
            navItems={NAV}
            moduleTitle="My team"
            moduleSubtitle="Everyone in your branch — endorsements, attendance, and team records (no line-manager linking required)."
            stickySubnav
            compact
          />
        }
      >
        <Route index element={<TeamHrHome />} />
        <Route path="staff" element={<TeamHrStaff />} />
        <Route path="org-chart" element={<TeamHrOrgChart />} />
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
