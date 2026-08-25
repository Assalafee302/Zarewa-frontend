import React from 'react';
import { Navigate } from 'react-router-dom';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { chairmanOfficeHrefFromLegacyFamily } from '../../lib/chairmanOfficeHrefs';

const TABS = ['scholarship', 'domestic', 'hq-special', 'mining'];

/** Household, scholarships, and mining are Chairman Office — not company HR. */
export default function HrStaffRegisters() {
  const { tab } = useHrUrlTab('scholarship', TABS);
  return <Navigate to={chairmanOfficeHrefFromLegacyFamily(tab)} replace />;
}
