import React from 'react';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import HrOrgChart from './HrOrgChart';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';

/** Team-scoped organogram — direct reports and their reporting lines. */
export default function TeamHrOrgChart() {
  return (
    <HrPageBody>
      <HrPageIntro
        title="Team organogram"
        description="Reporting lines for your team scope. Use the directory to assign line managers where staff are unlinked."
      />
      <HrOrgChart staffBasePath={HR_EMPLOYEES} teamMode />
    </HrPageBody>
  );
}
