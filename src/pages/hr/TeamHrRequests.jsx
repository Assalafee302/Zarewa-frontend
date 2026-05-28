import React from 'react';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';

export default function TeamHrRequests() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Endorse leave and loan requests from your branch team before HQ HR and GM HR complete the workflow.
      </p>
      <HrRequestsPanel allowedScopes={['endorse_queue']} defaultScope="endorse_queue" staffLinkBase="/hr/staff" />
    </div>
  );
}
