import React from 'react';
import { useSearchParams } from 'react-router-dom';
import HrStaffDirectory from './HrStaffDirectory';

/** Team-scoped staff directory — same workstation UX as HQ, without admin bulk tools. */
export default function TeamHrStaff() {
  const [searchParams] = useSearchParams();
  const quick = searchParams.get('quick') || searchParams.get('quickFilter') || '';

  return (
    <HrStaffDirectory
      teamMode
      listTitle="Team roster"
      initialQuickFilter={quick}
    />
  );
}
