import React from 'react';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';

export default function ExecutiveHrApprovals() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Sensitive HR requests awaiting GM HR or final executive approval.</p>
      <HrRequestsPanel allowedScopes={['gm_queue', 'hr_queue']} defaultScope="gm_queue" />
    </div>
  );
}
