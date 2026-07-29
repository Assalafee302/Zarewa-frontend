import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareWarning } from 'lucide-react';
import { FinanceSequencePanel } from '../layout';

/**
 * Manager glance — customer complaints / escalations.
 *
 * Honest gap: there is no branch-wide “open complaints” feed. CRM stores per-customer
 * interactions with no open/closed status, no list-all API, and the Sales UI logs notes
 * as kind=note (not complaint). Surfacing a fake queue would be decorative — we label
 * the gap and deep-link to Customers instead.
 */
export function ManagerCustomerIssuesPanel({ available = true }) {
  return (
    <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-0 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-black text-zarewa-teal tracking-tight flex items-center gap-2">
            <MessageSquareWarning size={16} aria-hidden />
            Customer issues
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Complaints & service escalations for this branch</p>
        </div>
        {available ? (
          <Link
            to="/customers"
            className="text-ui-xs font-bold uppercase text-zarewa-teal no-underline hover:underline"
          >
            Customers →
          </Link>
        ) : null}
      </div>

      <div className="px-4 py-5 space-y-3">
        {!available ? (
          <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-2 text-ui-xs text-amber-900">
            Sales / customers permission missing — CRM glance unavailable. Not approximated.
          </p>
        ) : (
          <>
            <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-3">
              <p className="text-xs font-bold text-amber-950">No branch open-complaints feed yet</p>
              <p className="mt-1.5 text-ui-xs text-amber-900 leading-relaxed">
                CRM interactions exist per customer (`/api/customers/:id/interactions`) but there is no open/closed
                status, no branch-wide list, and the customer desk currently saves notes as kind “note” — not a
                complaint queue the Manager desk can truthfully count.
              </p>
            </div>
            <p className="text-ui-xs text-slate-600 leading-relaxed">
              Until a real open-case list exists, review customer timelines in Sales CRM. Commercial exceptions
              (refunds, credit, clearance) still land in Needs approval.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/customers"
                className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-ui-xs font-bold uppercase text-zarewa-teal no-underline hover:border-zarewa-teal"
              >
                Open customer list
              </Link>
              <Link
                to="/sales"
                className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-ui-xs font-bold uppercase text-slate-600 no-underline hover:border-slate-300"
              >
                Sales desk
              </Link>
            </div>
          </>
        )}
      </div>
    </FinanceSequencePanel>
  );
}
