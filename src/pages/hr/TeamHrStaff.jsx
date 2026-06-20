import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import HrStaffDirectory from './HrStaffDirectory';

/** Team-scoped staff directory — same workstation UX as HQ, without admin bulk tools. */
export default function TeamHrStaff() {
  const [searchParams] = useSearchParams();
  const quick = searchParams.get('quick') || searchParams.get('quickFilter') || '';

  return (
    <HrPageBody>
      <HrPageIntro
        title="Team roster"
        description="Scoped directory for supervisors and department heads — salary and bank details are never shown here."
      />
      <HrStaffDirectory teamMode listTitle="Team roster" initialQuickFilter={quick} />
    </HrPageBody>
  );
}
