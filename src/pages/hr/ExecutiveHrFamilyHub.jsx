import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { chairmanOfficeHrefFromLegacyFamily } from '../../lib/chairmanOfficeHrefs.js';

/** Family & household now live on Chairman Office. */
export default function ExecutiveHrFamilyHub() {
  const [searchParams] = useSearchParams();
  return <Navigate to={chairmanOfficeHrefFromLegacyFamily('family', searchParams)} replace />;
}
