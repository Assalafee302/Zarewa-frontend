import React from 'react';
import { HrLeavePolicySection } from '../../components/hr/HrLeavePolicySection';

export default function ExecutiveHrLeavePolicy() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Set default annual leave days by entitlement band and staff loan limits. Changes apply on the next leave balance
        recompute.
      </p>
      <HrLeavePolicySection executive />
    </div>
  );
}
