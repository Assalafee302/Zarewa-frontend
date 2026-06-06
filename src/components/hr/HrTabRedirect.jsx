import React from 'react';
import { Navigate } from 'react-router-dom';
import { hrTabPath } from '../../lib/hrRoutes';

/** Redirect legacy HR routes to consolidated paths with ?tab= */
export default function HrTabRedirect({ base, tab, extra = {} }) {
  return <Navigate to={hrTabPath(base, tab, extra)} replace />;
}
