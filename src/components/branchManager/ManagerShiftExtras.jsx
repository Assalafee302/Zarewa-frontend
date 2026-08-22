import React from 'react';
import { ManagerBreakEvenCard } from './ManagerBreakEvenCard';
import { ManagerOtBoardPanel } from './ManagerOtBoardPanel';
import { ManagerOtApprovalsPanel } from './ManagerOtApprovalsPanel';
import { ManagerOpsHealthPanel } from './ManagerOpsHealthPanel';
import {
  ManagerAnnouncementsPanel,
  ManagerAuditTrailPanel,
  ManagerDeliveryComplaintsPanel,
  ManagerPmDuePanel,
  ManagerPriceExceptionsPanel,
  ManagerSopLinksPanel,
  ManagerStockRequestsPanel,
  ManagerVacanciesPanel,
} from './ManagerDeskExtras';

/**
 * Shift ops that do not belong on the morning board — OT, stock, notices, SOP.
 */
export function ManagerShiftExtras({
  branchId,
  coilRequests = [],
  onStockApproved,
  quotations = [],
  peopleGlanceAvailable = false,
  customerIssuesAvailable = false,
}) {
  return (
    <section className="space-y-4" aria-labelledby="manager-shift-heading">
      <div>
        <h2 id="manager-shift-heading" className="text-sm font-semibold text-slate-900">
          Shift
        </h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Overtime, stock requests, notices, and plant follow-ups — not the morning queue.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ManagerBreakEvenCard branchId={branchId} />
        <ManagerOtBoardPanel branchId={branchId} />
        <ManagerOpsHealthPanel branchId={branchId} />
      </div>
      <ManagerOtApprovalsPanel branchId={branchId} />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ManagerStockRequestsPanel coilRequests={coilRequests} onApproved={onStockApproved} />
        <ManagerAnnouncementsPanel />
        <ManagerAuditTrailPanel />
        <ManagerPriceExceptionsPanel quotations={quotations} />
        <ManagerVacanciesPanel available={peopleGlanceAvailable} />
        <ManagerPmDuePanel />
        <ManagerSopLinksPanel />
        <ManagerDeliveryComplaintsPanel available={customerIssuesAvailable} />
      </div>
    </section>
  );
}
