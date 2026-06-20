import { HR_SELF_SERVICE_PATH } from './hrSelfServiceRoutes';
import { teamHrTimeAbsencePath } from './teamHrRoutes';
import { HR_TIME_ABSENCE } from './hrRoutes';

/**
 * Scope-specific empty queue copy for HrRequestsPanel.
 * @param {string} scope
 * @param {{ selfService?: boolean }} [opts]
 */
export function hrRequestsEmptyState(scope, opts = {}) {
  if (opts.selfService || scope === 'mine') {
    return {
      title: 'No requests yet',
      description: 'Leave, loan, and profile change requests appear here once you submit them.',
      quickLinks: [
        { to: HR_SELF_SERVICE_PATH.timeOff + '?tab=leave', label: 'Apply for leave', primary: true },
        { to: HR_SELF_SERVICE_PATH.loans, label: 'Apply for loan' },
      ],
    };
  }
  if (scope === 'endorse_queue') {
    return {
      title: 'No endorsements waiting',
      description: 'When someone on your team applies for leave or a loan, it appears here for your endorsement before HQ review.',
      quickLinks: [
        { to: teamHrTimeAbsencePath('calendar'), label: 'Leave calendar', primary: true },
        { to: '/team-hr/staff', label: 'Team roster' },
      ],
    };
  }
  if (scope === 'hr_queue') {
    return {
      title: 'HR queue is clear',
      description: 'Submitted requests that passed branch endorsement will show here for HR review.',
      quickLinks: [{ to: HR_TIME_ABSENCE + '?tab=approvals', label: 'Time & absence hub', primary: true }],
    };
  }
  if (scope === 'gm_queue') {
    return {
      title: 'No GM approvals pending',
      description: 'Loan and sensitive requests that need GM HR sign-off appear in this queue.',
      quickLinks: [{ to: HR_TIME_ABSENCE + '?tab=approvals', label: 'Approvals hub', primary: true }],
    };
  }
  return {
    title: 'No requests in this queue',
    description: 'Try another scope or check back when new requests are submitted.',
    quickLinks: [],
  };
}
