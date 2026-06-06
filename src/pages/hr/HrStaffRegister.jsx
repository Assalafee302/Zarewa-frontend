import React from 'react';
import { Navigate } from 'react-router-dom';

/** Legacy full-page register — redirects to Employees directory with modal open. */
export default function HrStaffRegister() {
  return <Navigate to="/hr/employees?tab=directory&register=1" replace />;
}
