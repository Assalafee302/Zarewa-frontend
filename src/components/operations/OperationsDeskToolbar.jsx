import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Printer } from 'lucide-react';
import { AiAskButton } from '../AiAskButton';
import { OPS_GHOST_BTN, OPS_TOOL_BTN, OPS_TOOL_BTN_PRIMARY } from './operationsDeskUi';

const ASK_PROMPTS = {
  overview: 'Summarize coil and accessory stock, pending production, and what coils to buy for this workspace.',
  inventory: 'Summarize stock risk, in-transit receipts, and the most important store actions.',
  materialExceptions: 'Which stock-damage or material exceptions need action first, and why?',
  production: 'Which production jobs or conversion checks need attention first, and why?',
};

/**
 * Operations header tools: Ask AI, overtime (when permitted), print follow-up on Register.
 */
export function OperationsDeskToolbar({
  activeTab,
  searchQuery,
  onPrintFollowUp,
  printDisabled = false,
  canOtRequest = false,
}) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
      <AiAskButton
        mode="operations"
        prompt={ASK_PROMPTS[activeTab] || ASK_PROMPTS.overview}
        pageContext={{
          source: 'operations-page',
          activeTab,
          searchQuery,
        }}
        className={OPS_GHOST_BTN}
        title="Ask AI about this operations desk"
      >
        Ask AI
      </AiAskButton>
      {canOtRequest ? (
        <Link
          to="/operations/overtime"
          className={OPS_TOOL_BTN}
          title="Overtime pay requests"
          data-testid="ops-open-overtime-hub"
        >
          <Clock size={14} aria-hidden />
          Overtime
        </Link>
      ) : null}
      {activeTab === 'production' ? (
        <button
          type="button"
          onClick={onPrintFollowUp}
          disabled={printDisabled}
          className={OPS_TOOL_BTN_PRIMARY}
          title={
            printDisabled
              ? 'No waiting or in-production jobs to print'
              : 'Print all waiting or in-production jobs (quotation, cutting list, customer, project, colour, gauge)'
          }
        >
          <Printer size={14} aria-hidden />
          Print follow-up
        </button>
      ) : null}
    </div>
  );
}
